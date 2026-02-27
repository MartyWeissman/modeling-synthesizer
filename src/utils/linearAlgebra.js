// src/utils/linearAlgebra.js
// Pure linear algebra functions for matrix/vector operations (up to 4x4)

export const identity = (n) =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

export const zeros = (rows, cols) =>
  Array.from({ length: rows }, () => Array(cols).fill(0));

export const ones = (n) => Array.from({ length: n }, () => [1]);

export const zerosVec = (n) => Array.from({ length: n }, () => [0]);

export const matAdd = (A, B) =>
  A.map((row, i) => row.map((val, j) => val + B[i][j]));

export const matMul = (A, B) => {
  const rows = A.length;
  const cols = B[0].length;
  const inner = B.length;
  const result = [];
  for (let i = 0; i < rows; i++) {
    result[i] = [];
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let k = 0; k < inner; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
};

// v is stored as [[v1],[v2],...] (column vector as 2D array)
export const matVecMul = (A, v) =>
  A.map((row) => [row.reduce((sum, val, j) => sum + val * v[j][0], 0)]);

export const vecAdd = (v, w) => v.map((row, i) => [row[0] + w[i][0]]);

export const scalarVecMul = (s, v) => v.map((row) => [s * row[0]]);

// Resize matrix, preserving overlapping values, filling new cells from defaultMat
export const resizeMatrix = (oldMat, newRows, newCols, defaultMat) => {
  const result = [];
  for (let i = 0; i < newRows; i++) {
    result[i] = [];
    for (let j = 0; j < newCols; j++) {
      if (i < oldMat.length && j < oldMat[0].length) {
        result[i][j] = oldMat[i][j];
      } else {
        result[i][j] = defaultMat[i][j];
      }
    }
  }
  return result;
};

// Resize vector (column vector as 2D array), preserving overlapping values
export const resizeVector = (oldVec, newDim, defaultVec) => {
  const result = [];
  for (let i = 0; i < newDim; i++) {
    if (i < oldVec.length) {
      result[i] = [oldVec[i][0]];
    } else {
      result[i] = [defaultVec[i][0]];
    }
  }
  return result;
};
