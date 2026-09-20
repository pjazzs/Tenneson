import api from "./axios";

/*
|--------------------------------------------------------------------------
| Get Promotion History
|--------------------------------------------------------------------------
*/

export const getPromotions = async (params = {}) => {
  const response = await api.get("/promotions", {
    params,
  });

  return response.data;
};

/*
|--------------------------------------------------------------------------
| Apply Promotion
|--------------------------------------------------------------------------
*/

export const applyPromotion = async (resultId) => {
  const response = await api.patch(`/promotions/${resultId}/apply`);

  return response.data;
};
