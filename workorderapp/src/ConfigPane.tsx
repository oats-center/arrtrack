import React from 'react';
import { observer } from 'mobx-react-lite';
import log from './log';
import { context } from './state';
import { Button, LinearProgress, Select, Autocomplete } from '@mui/material';
import { MenuItem, TextField, SelectChangeEvent, Slider } from '@mui/material';
import { Paper, Table, TableContainer, TableCell, TableBody, TableRow, TableHead } from '@mui/material';
import numeral from 'numeral';

const { info, warn } = log.get('config-pane');

export const ConfigPane = observer(function ConfigPane() {
  const { state, actions } = React.useContext(context);

  const [inzone, setInzone] = React.useState<Boolean>(false);

  const [isVisible, setIsVisible] = React.useState(state.checkbox);

  // Toggle visibility based on checkbox
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsVisible(event.target.checked);
  };

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    state.sliderValue = newValue as number; // Update the state directly
  };

  const [selectedDate, setSelectedDate] = React.useState(state.chosenDate);
  const [selectedVehicle, setSelectedVehicle] = React.useState<string | null>(state.chosenVehicleID);

  const vehicleList = actions.getVehicleIDsForDate(selectedDate || '');
  const roadSegments = actions.roadSegTracksForVOnD();

  const handleChangeDate = (event: SelectChangeEvent<string | null>) => {
    const selectedDate = event.target.value as string;
    setSelectedDate(selectedDate);
    actions.updateChosenDate(selectedDate); // Update chosenDate in state

    // Reset selected vehicle when date changes
    setSelectedVehicle('');
    actions.updateChosenVehicleID('');
  };

  const handleChangeVehicle = (event: SelectChangeEvent<string | null>) => {
    const selectedVehicle = event.target.value as string | null;
    setSelectedVehicle(selectedVehicle);
    actions.updateChosenVehicleID(selectedVehicle); // Update chosenVehicleID in state

    if (state.chosenDate !== null && state.chosenVehicleID != null) {
      actions.filterDayTracks({ vehicleid: state.chosenVehicleID, day: state.chosenDate });
      actions.filterGeoJSON({ vid: state.chosenVehicleID, day: state.chosenDate })
      //actions.updateMap();
    }
  };

  const handleFile = ({ filetype, eventtype, inout }: { filetype: 'tracks' | 'workorders' | 'vehicleactivities', eventtype: 'drop' | 'drag', inout?: boolean }): React.DragEventHandler => async (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    switch (eventtype) {

      case 'drag':
        if (inzone !== inout) {
          setInzone(inout || false);
          if (inout) evt.dataTransfer.dropEffect = "copy"; // makes a green plus on mac
        }
        break;

      case 'drop':
        const files = [...evt.dataTransfer.files]; // It is dumb that I have to do this
        if (files.length < 1) {
          info('No files dropped!');
          return;
        }
        switch (filetype) {
          case 'tracks':
            actions.parsingInProgress(true);
            actions.loadDayTracks({ file: files[0]! });
            break;
          case 'workorders':
            actions.loadKnownWorkorders({ file: files[0]! });
            break;
          case 'vehicleactivities':
            actions.loadVehicleActivities(files[0]!);
            break;
        }
    }
  };

  const numrows = state.parsing.currentNumRows;


  return (
    <div style={{ width: '30vw', height: '90vh', padding: '5px' }} >

      {!window.location.toString().match(/debug/) ? <React.Fragment /> :
        <Autocomplete
          style={{ marginTop: '10px', marginBottom: '5px' }}
          options={state.geojsonviz.files}
          value={state.geojsonviz.selectedFile}
          onChange={(_evt, value) => actions.selectGeojsonVizFile(value as string)}
          renderInput={(params) => <TextField {...params} label="Load Road Tile" />}
        />
      }

      <div style={{ padding: '5px', margin: '5px', height: '12%', alignItems: 'center', justifyContent: 'center', display: 'flex', border: '3px dashed #000088', borderRadius: '3px' }}
        onDragOver={handleFile({ filetype: 'tracks', eventtype: 'drag' })}
        onDrop={handleFile({ filetype: 'tracks', eventtype: 'drop' })}
        onDragEnter={handleFile({ filetype: 'tracks', eventtype: 'drag', inout: true })}
        onDragLeave={handleFile({ filetype: 'tracks', eventtype: 'drag', inout: false })}
      >
        {
          !state.parsing.inprogress && !state.daytracks.rev ? 'Drop GPS tracks file here.' :
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {state.parsing.state === 'roads'
                ? <div>Identifying roads: {numeral(numrows).format('0,0')} Points</div>
                : state.parsing.state === 'preprocessed'
                  ? <div>Loading preprocessd tracks...</div>
                  : <div>Loaded {numeral(numrows).format('0,0')} Points ({state.parsing.state})</div>
              }

              {state.parsing.state !== 'preprocessed'
                ? <div style={{ flexGrow: 1, width: '100%' }}>
                  <LinearProgress variant="determinate" value={100 * numrows / (state.parsing.estimatedRows || 1)} />
                </div>
                : <React.Fragment />
              }

              {state.parsing.inprogress ? <React.Fragment /> :
                <Button onClick={() => actions.exportProcessedTracks()}>Export Processed Tracks</Button>
              }
            </div>
        }
      </div>

      <div style={{ padding: '5px' }}>
        <label>
          <input
            type="checkbox"
            checked={isVisible}
            onChange={handleCheckboxChange}
          /> Create WorkOrders
        </label>
      </div>

      <div style={{ padding: '5px', margin: '5px', height: '12%', alignItems: 'center', justifyContent: 'center', display: 'flex', border: '3px dashed #008800', borderRadius: '3px' }}
        onDragOver={handleFile({ filetype: 'workorders', eventtype: 'drag' })}
        onDrop={handleFile({ filetype: 'workorders', eventtype: 'drop' })}
        onDragEnter={handleFile({ filetype: 'workorders', eventtype: 'drag', inout: true })}
        onDragLeave={handleFile({ filetype: 'workorders', eventtype: 'drag', inout: false })}
      >
        {
          state.knownWorkorders.parsing
            ? 'Reading work orders...'
            : !state.knownWorkorders.orders.rev
              ? 'Drop work orders spreadsheet here to validate.'
              : <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div>Loaded {numeral(actions.numKnownWorkorders()).format('0,0')} Work Orders</div>
              </div>
        }
      </div>

      <div style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <Button
          style={{ flexGrow: 1 }}
          onClick={() => actions.validateWorkorders()}
          variant="contained"
          disabled={!actions.knownWorkorders() || !actions.daytracks()}
        >
          Validate Work Orders
        </Button>
      </div>

      {isVisible && (
        <div style={{ padding: '10px', margin: '5px', height: '20%', alignItems: 'center', justifyContent: 'center', display: 'flex', border: '3px dashed #008800', borderRadius: '3px' }}
          onDragOver={handleFile({ filetype: 'vehicleactivities', eventtype: 'drag' })}
          onDrop={handleFile({ filetype: 'vehicleactivities', eventtype: 'drop' })}
          onDragEnter={handleFile({ filetype: 'vehicleactivities', eventtype: 'drag', inout: true })}
          onDragLeave={handleFile({ filetype: 'vehicleactivities', eventtype: 'drag', inout: false })}
        >
          {
            state.createdWorkOrders.parsing
              ? 'Reading vehicle activities...'
              : !state.createdWorkOrders.vehicleActivities.rev
                ? 'Drop vehicle activities spreadsheet here.'
                : <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div>Found {numeral((actions.vehicleActivities() || []).length).format('0,0')} Vehicle Activities</div>
                  {state.createdWorkOrders.workorders.rev > 0
                    ? <div>Successfully created {numeral(actions.createdWorkOrders()?.length || 0).format('0,0')} Work Orders</div>
                    : <React.Fragment />
                  }
                </div>
          }
        </div>
      )}

      {isVisible && (
        <div style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
          <Button
            style={{ flexGrow: 1 }}
            onClick={() => {
              if (state.createdWorkOrders.parsing) return;
              actions.createWorkOrders()
            }}
            variant="contained"
            disabled={!actions.vehicleActivities() || !actions.daytracks() || state.createdWorkOrders.parsing || state.createdWorkOrders.workorders.rev > 0}
          >
            Create Work Records from GPS Tracks (PoC)
          </Button>
        </div>
      )}


      <div style={{ padding: '5px' }}>
        {!isVisible && (
          <div style={{ padding: '5px' }}>
            <Slider
              value={state.sliderValue}
              onChange={handleSliderChange}
              aria-labelledby="input-slider"
              min={0.001}
              max={1}
              step={0.001}
            />
          </div>

        )}
        {!isVisible && (
          <div style={{ padding: '5px' }}>
            <Select
              value={selectedDate}
              onChange={handleChangeDate}
              displayEmpty
              style={{ marginRight: '50px', marginLeft: '30px' }} // Add spacing between the two Select components
            >
              <MenuItem value="" disabled>Select Date</MenuItem>
              {actions.getDateList().map(date => (
                <MenuItem key={date} value={date}>
                  {date}
                </MenuItem>
              ))}
            </Select>

            <Select
              value={selectedVehicle}
              onChange={handleChangeVehicle}
              displayEmpty
              style={{ marginRight: '10px' }} // Add spacing between the two Select components
            >
              <MenuItem value="" disabled>Select Vehicle</MenuItem>
              {vehicleList.map(vehicle => (
                <MenuItem key={vehicle.vehicleId} value={vehicle.vehicleId}>
                  {vehicle.vehicleId} ({numeral(vehicle.count).format('0,0')} points)
                </MenuItem>
              ))}
            </Select>
          </div>
        )}
        {!isVisible && (
          <div style={{ padding: '4px', marginLeft: '15px' }}>
            {selectedVehicle && (
              <div>
                Computed Drive Hrs: {vehicleList.find(v => v.vehicleId === selectedVehicle)?.computedHrs.toFixed(2)},
                Reported Drive Hrs: {vehicleList.find(v => v.vehicleId === selectedVehicle)?.totalHrs.toFixed(2)}
              </div>
            )}
          </div>
        )}
        {!isVisible && (
          <div style={{ height: '220px', overflow: 'auto', marginLeft: '15px' }}>
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 350 }} size="small" aria-label="a dense table">
                <TableHead>
                  <TableRow>
                    <TableCell style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'left' }}>Segment Name</TableCell>
                    <TableCell style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'left' }}>Computed Hrs</TableCell>
                    <TableCell style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'left' }}>Reported Hrs</TableCell>
                    <TableCell style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'left' }}>Selected Track</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roadSegments
                    .filter(track => track.vid.toString() === selectedVehicle && track.day === selectedDate)
                    .map((track, index) => (
                      <TableRow>
                        <TableCell style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'left' }}>{track.seg}</TableCell>
                        <TableCell style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'left' }}>{track.ctime.toFixed(2)}</TableCell>
                        <TableCell style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'left' }}>{track.rtime.toFixed(2)}</TableCell>
                        <TableCell style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'left' }}>
                          <input
                            type="radio"
                            name="selectedSegment"
                            onChange={() => {
                              actions.updateCsegment(track.seg);
                              actions.getRoadSegPoints();
                            }}
                            checked={state.csegment === track.seg}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        )}
      </div>
    </div>
  );

});


