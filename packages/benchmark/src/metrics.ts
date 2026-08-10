export interface ConfusionMatrix {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

export function calculateMetrics(matrix: ConfusionMatrix) {
  const { tp, fp, fn, tn } = matrix;
  
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  
  return {
    precision,
    recall,
    f1,
    accuracy: (tp + tn) / (tp + tn + fp + fn),
  };
}
