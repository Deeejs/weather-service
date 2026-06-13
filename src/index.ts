import express from 'express';

const app = express();
const PORT = 3000;

// Talks to the National Weather Service API to get a forecast
async function getForecast(lat: any, lon: any) {
  // First get the grid point info from the points endpoint
  const pointsResponse = await fetch(
    `https://api.weather.gov/points/${lat},${lon}`,
    { headers: { 'User-Agent': 'weather-service' } }
  );
  if (!pointsResponse.ok) {
    throw new Error(`points request failed with status ${pointsResponse.status}`);
  }
  const pointsData = await pointsResponse.json();

  const forecastUrl = pointsData.properties.forecast;

  // Now get the actual forecast
  const forecastResponse = await fetch(forecastUrl, {
    headers: { 'User-Agent': 'weather-service' },
  });
  if (!forecastResponse.ok) {
    throw new Error(`forecast request failed with status ${forecastResponse.status}`);
  }
  const forecastData = await forecastResponse.json();

  const periods = forecastData.properties.periods;
  const today = periods[0];

  let temperature = today.temperature;
  let characterization = '';
  if (temperature < 50) {
    characterization = 'cold';
  } else if (temperature > 80) {
    characterization = 'hot';
  } else {
    characterization = 'moderate';
  }

  return {
    shortForecast: today.shortForecast,
    temperature: temperature,
    temperatureType: characterization,
  };
}

app.get('/forecast', async (req, res) => {
  const lat = req.query.lat;
  const lon = req.query.lon;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }

  try {
    const result = await getForecast(lat, lon);
    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'something went wrong' });
  }
});

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
