const express = require('express');
const router = express.Router();
const {
  getCities,
  getCityById,
  getCitiesByCountry,
  searchCities,
  createCity,
  updateCity,
  deleteCity
} = require('../controllers/cityController');

// Rutas para ciudades
router.get('/', getCities);
router.get('/:id', getCityById);
router.get('/country/:countryId', getCitiesByCountry);
router.get('/search', searchCities);
router.post('/', createCity);
router.put('/:id', updateCity);
router.delete('/:id', deleteCity);

module.exports = router;