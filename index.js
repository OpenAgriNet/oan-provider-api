const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

app.post("/get_apmc_market_price", async (req, res) => {
  const { latitude, longitude, for_date, crops } = req.body;

  if (
    !latitude ||
    !longitude ||
    !for_date ||
    !Array.isArray(crops) ||
    crops.length === 0
  ) {
    return res.status(400).json({
      status: 400,
      response:
        "Invalid payload: 'latitude','longitude','for_date' and 'crops' are required.",
      data: [],
    });
  }

  const graphqlQuery = {
    query: `
      query SearchMandi($for_date: date!, $crops: [String!], $latitude: String!, $longitude: String!) {
        mandihouse(
          where: {
            for_date: { _eq: $for_date },
            crop_name: { _in: $crops },
              latitude: { _eq: $latitude },
                longitude: { _eq: $longitude },
          }
        ) {
          for_date
          apmc_id
          dtname
          thname
          apmc_name
          crop_name
          variety_name
          low_price
          high_price
          price
          quantity
          distance
          distance_unit
        }
      }
    `,
    variables: {
      for_date,
      crops,
      latitude: typeof latitude == "string" ? latitude : latitude.toString(),
      longitude:
        typeof longitude == "string" ? longitude : longitude.toString(),
    },
  };

  try {
    const response = await axios.post(process.env.HASURA_URL, graphqlQuery, {
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET,
      },
    });

    if (response.data.errors) {
      console.error("GraphQL returned errors:", response.data.errors);
      return res.status(500).json({
        status: 500,
        response: "Error fetching APMC Market information",
        data: [],
      });
    }

    const results = response.data.data?.mandihouse || [];

    res.status(200).json({
      status: 200,
      response: "APMC Market information retrieved successfully",
      data: results,
    });
  } catch (err) {
    console.error("Hasura query error:", err.response?.data || err.message);
    res.status(500).json({
      status: 500,
      response: "Internal Server Error",
      data: [],
    });
  }
});

app.post("/get_nearest_warehouses", async (req, res) => {
  const { longitude, latitude } = req.body;

  if (typeof longitude !== "string" || typeof latitude !== "string") {
    return res.status(400).json({
      status: 400,
      response: "Invalid or missing longitude/latitude",
      data: [],
    });
  }

  // GraphQL query to get warehouses with distance calculation (assuming distance column or calculation exists)
  // You might want to calculate distance on backend or DB side.
  const graphqlQuery = {
    query: `
      query GetWarehouses($latitude: String!, $longitude: String!) {
        warehouse(
           where: {
                latitude: { _eq: $latitude },
                longitude: { _eq: $longitude },
          }
        ) {
          warehouse_code
          warehouse_name
          phone
          email
          village
          taluka
          district
          warehouse_address
          region
          pincode
          distance
          distance_unit
        }
      }
    `,
    variables: {
      latitude: typeof latitude == "string" ? latitude : latitude.toString(),
      longitude:
        typeof longitude == "string" ? longitude : longitude.toString(),
    },
  };

  try {
    const response = await axios.post(
      process.env.HASURA_URL,

      graphqlQuery,

      {
        headers: {
          "Content-Type": "application/json",
          "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET,
        },
      }
    );

    if (response.data.errors) {
      return res.status(500).json({
        status: 500,
        response: "Error fetching warehouses from Hasura",
        data: response.data.errors,
      });
    }

    const warehouses = response.data.data.warehouse;

    return res.json({
      status: 200,
      response: "Nearest Warehouse information retrieved successfully",
      data: warehouses,
    });
  } catch (error) {
    console.error("Hasura query error:", error.message);
    return res.status(500).json({
      status: 500,
      response: "Internal server error",
      data: [],
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
