const { getDbTenant } = require("../../config/db");

const getInventorySummary = async (tenantId, countDate) => {
  const db = getDbTenant(tenantId);

  // Agregación para obtener solo productId y totalQuantity
  const summary = await db
    .collection("mp_ch_temporary_counts")
    .aggregate([
      { $match: { countDate: countDate } },
      { $unwind: "$batchLines" },
      {
        $group: {
          _id: "$productId",
          totalQuantity: { $sum: "$batchLines.quantity" },
        },
      },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          totalQuantity: 1,
        },
      },
    ])
    .toArray();

  return summary;
};

module.exports = { getInventorySummary };
