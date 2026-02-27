import React, { useState, useMemo, useCallback } from "react";
import {
  GridButton,
  GridInput,
  GridLabel,
  GridMatrixInput,
} from "../components/grid";
import ToolContainer from "../components/ui/ToolContainer";
import { useTheme } from "../hooks/useTheme";
import {
  identity,
  zeros,
  ones,
  zerosVec,
  matAdd,
  matMul,
  matVecMul,
  vecAdd,
  scalarVecMul,
  resizeMatrix,
  resizeVector,
} from "../utils/linearAlgebra";

const MatrixVectorCalculatorTool = () => {
  const { theme, currentTheme } = useTheme();

  // Dimension state
  const [dim, setDim] = useState(2);

  // Input state
  const [matM, setMatM] = useState(identity(2));
  const [matN, setMatN] = useState(zeros(2, 2));
  const [vecV, setVecV] = useState(ones(2));
  const [vecW, setVecW] = useState(zerosVec(2));
  const [lambda, setLambda] = useState(1);

  // Dimension cycling
  const cycleDim = useCallback(() => {
    const nextDim = dim === 2 ? 3 : dim === 3 ? 4 : 2;
    setDim(nextDim);
    setMatM((prev) => resizeMatrix(prev, nextDim, nextDim, identity(nextDim)));
    setMatN((prev) => resizeMatrix(prev, nextDim, nextDim, zeros(nextDim, nextDim)));
    setVecV((prev) => resizeVector(prev, nextDim, ones(nextDim)));
    setVecW((prev) => resizeVector(prev, nextDim, zerosVec(nextDim)));
  }, [dim]);

  // Computed results (all 7 operations)
  const mPlusN = useMemo(() => matAdd(matM, matN), [matM, matN]);
  const mTimesN = useMemo(() => matMul(matM, matN), [matM, matN]);
  const mTimesV = useMemo(() => matVecMul(matM, vecV), [matM, vecV]);
  const nTimesW = useMemo(() => matVecMul(matN, vecW), [matN, vecW]);
  const vPlusW = useMemo(() => vecAdd(vecV, vecW), [vecV, vecW]);
  const lambdaV = useMemo(() => scalarVecMul(lambda, vecV), [lambda, vecV]);
  const lambdaW = useMemo(() => scalarVecMul(lambda, vecW), [lambda, vecW]);

  // Adaptive layout
  const matH = dim === 2 ? 2 : 3;
  const vecH = dim === 2 ? 2 : 3;
  const vecRow = matH; // vectors start right after matrices
  const labelRow = vecRow + vecH; // labels below vectors
  const canvasHeight = labelRow + 1;

  return (
    <ToolContainer
      title="Matrix & Vector Calculator"
      canvasWidth={11}
      canvasHeight={canvasHeight}
    >
      {/* Dimension selector */}
      <GridButton
        x={0}
        y={0}
        type="momentary"
        onPress={cycleDim}
        tooltip="Cycle dimension: 2x2, 3x3, 4x4"
        theme={theme}
      >
        <div style={{ textAlign: "center", lineHeight: "1.1" }}>
          <div style={{ fontSize: "12px" }}>Dim</div>
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>{dim}x{dim}</div>
        </div>
      </GridButton>

      {/* Scalar lambda */}
      <GridInput
        x={1}
        y={0}
        value={lambda}
        onChange={setLambda}
        min={-99}
        max={99}
        step={0.1}
        variable="λ"
        title="Scalar multiplier"
        theme={theme}
      />

      {/* ---- Input Matrices ---- */}
      <GridMatrixInput
        x={2}
        y={0}
        w={2}
        h={matH}
        rows={dim}
        cols={dim}
        values={matM}
        onChange={setMatM}
        label="M"
        theme={theme}
        tooltip="Input matrix M"
      />

      <GridMatrixInput
        x={4}
        y={0}
        w={2}
        h={matH}
        rows={dim}
        cols={dim}
        values={matN}
        onChange={setMatN}
        label="N"
        theme={theme}
        tooltip="Input matrix N"
      />

      {/* ---- Result Matrices ---- */}
      <GridMatrixInput
        x={7}
        y={0}
        w={2}
        h={matH}
        rows={dim}
        cols={dim}
        values={mPlusN}
        readOnly
        label="M + N"
        theme={theme}
        tooltip="Matrix sum M + N"
      />

      <GridMatrixInput
        x={9}
        y={0}
        w={2}
        h={matH}
        rows={dim}
        cols={dim}
        values={mTimesN}
        readOnly
        label="M × N"
        theme={theme}
        tooltip="Matrix product M × N"
      />

      {/* ---- Spacer label between inputs and results (col 6) ---- */}
      <GridLabel
        x={6}
        y={0}
        w={1}
        h={matH}
        text="→"
        textAlign="center"
        fontSize="large"
        theme={theme}
      />

      {/* ---- Input Vectors ---- */}
      <GridMatrixInput
        x={0}
        y={vecRow}
        w={1}
        h={vecH}
        rows={dim}
        cols={1}
        values={vecV}
        onChange={setVecV}
        label="v"
        theme={theme}
        tooltip="Input vector v"
      />

      <GridMatrixInput
        x={1}
        y={vecRow}
        w={1}
        h={vecH}
        rows={dim}
        cols={1}
        values={vecW}
        onChange={setVecW}
        label="w"
        theme={theme}
        tooltip="Input vector w"
      />

      {/* ---- Result Vectors ---- */}
      <GridMatrixInput
        x={2}
        y={vecRow}
        w={1}
        h={vecH}
        rows={dim}
        cols={1}
        values={mTimesV}
        readOnly
        label="Mv"
        theme={theme}
        tooltip="Matrix-vector product M × v"
      />

      <GridMatrixInput
        x={3}
        y={vecRow}
        w={1}
        h={vecH}
        rows={dim}
        cols={1}
        values={nTimesW}
        readOnly
        label="Nw"
        theme={theme}
        tooltip="Matrix-vector product N × w"
      />

      <GridMatrixInput
        x={4}
        y={vecRow}
        w={1}
        h={vecH}
        rows={dim}
        cols={1}
        values={vPlusW}
        readOnly
        label="v + w"
        theme={theme}
        tooltip="Vector sum v + w"
      />

      <GridMatrixInput
        x={5}
        y={vecRow}
        w={1}
        h={vecH}
        rows={dim}
        cols={1}
        values={lambdaV}
        readOnly
        label="λv"
        theme={theme}
        tooltip="Scalar-vector product λv"
      />

      <GridMatrixInput
        x={6}
        y={vecRow}
        w={1}
        h={vecH}
        rows={dim}
        cols={1}
        values={lambdaW}
        readOnly
        label="λw"
        theme={theme}
        tooltip="Scalar-vector product λw"
      />

      {/* ---- Info display ---- */}
      <GridLabel
        x={7}
        y={vecRow}
        w={4}
        h={1}
        text={`Operations update in real time | Dimension: ${dim}×${dim}`}
        textAlign="center"
        fontSize="small"
        theme={theme}
      />
    </ToolContainer>
  );
};

export default MatrixVectorCalculatorTool;
