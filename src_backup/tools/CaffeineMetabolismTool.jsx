// src/tools/CaffeineMetabolismTool.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
  GridButton,
  GridScreen,
  GridInput,
  GridDisplay
} from '../components/grid';
import { useTheme } from '../components/ui/ThemeProvider';
import {
  calculateCaffeineLevels,
  drawCaffeineGraph,
  getCurrentCaffeineLevel,
  calculateHalfLife
} from '../utils/mathHelpers';

const CaffeineMetabolismTool = () => {
  const { currentTheme, theme } = useTheme();
  const [doses, setDoses] = useState([
    { time: '07:00', dose: 120 },
    { time: '13:00', dose: 80 },
    { time: '16:00', dose: 40 }
  ]);
  const [metabolicRate, setMetabolicRate] = useState(0.2);
  const [data, setData] = useState([]);
  const canvasRef = useRef(null);

  // Graph Display Component using GridDisplay
  const GraphDisplay = ({ x, y, w, h }) => (
    <GridDisplay
      x={x} y={y} w={w} h={h}
      title="Caffeine levels over 72 hours"
      theme={theme}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full bg-white rounded border"
        width={600}
        height={300}
      />
    </GridDisplay>
  );

  const simulate = () => {
    const newData = calculateCaffeineLevels(doses, metabolicRate);
    setData(newData);
  };

  const updateDose = (index, field, value) => {
    const newDoses = [...doses];
    newDoses[index][field] = value;
    setDoses(newDoses);
  };

  const resetToDefaults = () => {
    setDoses([
      { time: '07:00', dose: 120 },
      { time: '13:00', dose: 80 },
      { time: '16:00', dose: 40 }
    ]);
    setMetabolicRate(0.2);
  };

  // Auto-simulate when parameters change
  useEffect(() => {
    simulate();
  }, [doses, metabolicRate]);

  // Draw plot when data changes
  useEffect(() => {
    if (data.length > 0) {
      drawCaffeineGraph(canvasRef.current, data);
    }
  }, [data]);

  return (
    <div className={`min-h-screen ${theme.bg} p-8`}>
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <h1 className={`text-2xl font-bold ${theme.text}`}>Caffeine Metabolism Tool</h1>
      </div>

      {/* Main 10x5 Grid Container */}
      <div className={`mx-auto ${theme.container} rounded-xl p-4 border-2 border-gray-400 ${theme.shadow}`}
           style={{ width: '1040px', height: '540px' }}>

        <div className="relative" style={{ width: '1000px', height: '500px' }}>

          {/* Row 0: Dose 1 Controls */}
          <GridScreen x={0} y={0} w={1} h={1} title="Dose 1 label" theme={theme} skinType={currentTheme}>
            D1
          </GridScreen>
          <GridInput
            x={1} y={0} w={2} h={1}
            type="time"
            value={doses[0].time}
            onChange={(val) => updateDose(0, 'time', val)}
            title="Time for dose 1"
            theme={theme}
          />
          <GridInput
            x={3} y={0} w={1} h={1}
            type="select"
            value={doses[0].dose}
            onChange={(val) => updateDose(0, 'dose', val)}
            options={[40, 80, 120, 160, 200]}
            title="Dose 1 amount"
            theme={theme}
          />

          {/* Current Level Display */}
          <GridScreen x={5} y={0} w={2} h={1} title="Current caffeine level" theme={theme} skinType={currentTheme}>
            <div className="text-center">
              <div>NOW: {getCurrentCaffeineLevel(data)}mg</div>
            </div>
          </GridScreen>

          {/* Metabolic Rate Control */}
          <GridScreen x={7} y={0} w={1} h={1} title="Metabolic rate label" theme={theme} skinType={currentTheme}>
            MR
          </GridScreen>
          <GridInput
            x={8} y={0} w={2} h={1}
            type="number"
            value={metabolicRate}
            onChange={setMetabolicRate}
            title="Metabolic rate (0.1-1.0)"
            theme={theme}
          />

          {/* Row 1: Dose 2 Controls */}
          <GridScreen x={0} y={1} w={1} h={1} title="Dose 2 label" theme={theme} skinType={currentTheme}>
            D2
          </GridScreen>
          <GridInput
            x={1} y={1} w={2} h={1}
            type="time"
            value={doses[1].time}
            onChange={(val) => updateDose(1, 'time', val)}
            title="Time for dose 2"
            theme={theme}
          />
          <GridInput
            x={3} y={1} w={1} h={1}
            type="select"
            value={doses[1].dose}
            onChange={(val) => updateDose(1, 'dose', val)}
            options={[40, 80, 120, 160, 200]}
            title="Dose 2 amount"
            theme={theme}
          />

          {/* Large Graph Display (6x3) */}
          <GraphDisplay x={4} y={1} w={6} h={3} />

          {/* Row 2: Dose 3 Controls */}
          <GridScreen x={0} y={2} w={1} h={1} title="Dose 3 label" theme={theme} skinType={currentTheme}>
            D3
          </GridScreen>
          <GridInput
            x={1} y={2} w={2} h={1}
            type="time"
            value={doses[2].time}
            onChange={(val) => updateDose(2, 'time', val)}
            title="Time for dose 3"
            theme={theme}
          />
          <GridInput
            x={3} y={2} w={1} h={1}
            type="select"
            value={doses[2].dose}
            onChange={(val) => updateDose(2, 'dose', val)}
            options={[40, 80, 120, 160, 200]}
            title="Dose 3 amount"
            theme={theme}
          />

          {/* Row 3: Peak Info */}
          <GridScreen x={0} y={3} w={4} h={1} title="Peak caffeine information" theme={theme} skinType={currentTheme}>
            <div className="text-xs">
              Peak: {Math.round(Math.max(...data))}mg • Half-life: {calculateHalfLife(metabolicRate)}h
            </div>
          </GridScreen>

          {/* Row 4: Status and Controls */}
          <GridButton
            x={0} y={4}
            onClick={simulate}
            tooltip="Recalculate"
            theme={theme}
          >
            ⟳
          </GridButton>
          <GridButton
            x={1} y={4}
            onClick={resetToDefaults}
            tooltip="Reset to defaults"
            theme={theme}
          >
            RST
          </GridButton>
          <GridScreen x={2} y={4} w={2} h={1} title="Simulation status" theme={theme} skinType={currentTheme}>
            <div>72h • 3 days • Auto</div>
          </GridScreen>
          <GridScreen x={4} y={4} w={6} h={1} title="Timeline" theme={theme} skinType={currentTheme}>
            <div className="text-xs">
              Day 1: {doses[0].time} {doses[1].time} {doses[2].time} | Day 2: Repeat | Day 3: Repeat
            </div>
          </GridScreen>

        </div>
      </div>
    </div>
  );
};

export default CaffeineMetabolismTool;
