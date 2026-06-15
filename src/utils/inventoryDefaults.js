// Este archivo sirve tanto para el backend como para el frontend (si usas TypeScript/JS compartido)
const getEmptyBatchLine = () => ({
  batch: "",
  quantity: 0,
  crates: 0,
  looseUnits: 0,
  packingDate: "",
  elapsedDays: 0,
});

const getInitialProductState = (productInfo) => ({
  id: productInfo.id,
  alternativeDescription:
    productInfo.alternativeDescription || "Sin descripción",
  unitsPerCrate: productInfo.unitsPerCrate || 0,
  batchLines: [], // Dejamos vacío o [getEmptyBatchLine()]
});

export default { getEmptyBatchLine, getInitialProductState };
