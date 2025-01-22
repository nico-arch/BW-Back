const Currency = require("../models/Currency");

const initCurrencies = async () => {
  try {
    // Liste des devises à créer
    const currencies = [
      {
        currencyCode: "USD",
        currencyName: "Dollar américain",
        currentExchangeRate: 1,
      },
      { currencyCode: "HTG", currencyName: "Gourde", currentExchangeRate: 132 }, // Exemple de taux initial
    ];

    for (let currencyData of currencies) {
      const existingCurrency = await Currency.findOne({
        currencyCode: currencyData.currencyCode,
      });

      if (!existingCurrency) {
        await Currency.create(currencyData);
        console.log(
          `Currency ${currencyData.currencyCode} created successfully.`,
        );
      } else {
        console.log(`Currency ${currencyData.currencyCode} already exists.`);
      }
    }
  } catch (error) {
    console.error("Error initializing currencies:", error.message);
  }
};

module.exports = initCurrencies;
