// addCards.js
require('dotenv').config();
const axios = require('axios');
const { getDatabase } = require('../database');
const { EmbedBuilder } = require('discord.js');

const pokemon = require('pokemontcgsdk'); 
pokemon.configure({ apiKey: process.env.POKEKEY });

// function getAllSets() {
//     return pokemon.set.all()
//       .then((sets) => {
//         const collection = getDatabase().collection('Sets');
  
//         // Get existing set IDs from the database
//         return getSetIdsFromDatabase().then(existingSetIds => {
//           // Filter out sets that already exist in the database
//           const newSets = sets.filter((set) => !existingSetIds.includes(set.id));
  
//           // Insert only the new sets into the database
//           return Promise.all(newSets.map((set) => collection.insertOne(set).then(() => set)));
//         });
//       });
//   }
  
//   function getAllCardsForSet(setId) {
//     return pokemon.card.where({ q: `set.id:${setId}` })
//       .then((response) => response.data);
//   }
  
//   function getSetIdsFromDatabase() {
//     const setCollection = getDatabase().collection('Sets');
//     return setCollection.find({}, { projection: { _id: 0, id: 1 } }).toArray()
//       .then((sets) => sets.map((set) => set.id));
//   }
  
//   function getCardIdsFromDatabase() {
//     const cardCollection = getDatabase().collection('Cards');
//     return cardCollection.find({}, { projection: { _id: 0, id: 1 } }).toArray()
//       .then((cards) => cards.map((card) => card.id));
//   }
  
//   function insertMissingCards(cards, existingCardIds) {
//     const cardCollection = getDatabase().collection('Cards');
  
//     const missingCards = cards.filter((card) => !existingCardIds.includes(card.id));
  
//     return Promise.all(missingCards.map((missingCard) => {
//       return cardCollection.insertOne(missingCard);
//     }));
//   }
  
//   // Start the process
//   Promise.all([getAllSets(), getCardIdsFromDatabase()])
//     .then(([newSets, existingCardIds]) => {
//       // For each new set, fetch and insert missing cards
//       return Promise.all(newSets.map((set) => {
//         return getAllCardsForSet(set.id)
//           .then((cards) => insertMissingCards(cards, existingCardIds));
//       }));
//     })
//     .then(() => {
//       console.log('All sets and missing cards inserted successfully.');
//     })
//     .catch((error) => {
//       console.error('Error:', error);
//     });
  
module.exports = {
        name: 'add-cards',
        description: 'Add cards to your collection',
        options: [
            {
                name: 'set',
                type: 3,
                description: 'Name of the Play set of the desired card.',
                required: true,
                choices: [],
                autocomplete: true,
            },
            {
                name: 'card-name',
                type: 3,
                description: 'The name of the card.',
                required: true,
                choices: [],
                autocomplete: true,
            },
            {
                name: 'amount',
                type: 4,
                description: 'How many cards you own',
                required: true,
            },
        ],
    async autocomplete(interaction) {
        try {
            if (!interaction.isAutocomplete()) return;

            const focusedOption = interaction.options.getFocused(true);
            let choices = [];
    
            if (focusedOption.name === 'set') {
                //console.log(focusedOption.name);
                // Your logic for handling shop_name autocomplete
                const userInput = focusedOption.value;
                const sets = await getDatabase().collection('Sets').find({ 'name': { $regex: userInput, $options: 'i' } }).toArray();
                //console.log(sets);

                // Flatten the 'data' array and then map over it
                choices = sets.map(set => ({ name: set.name, value: set.name }));
                //console.log(choices)
            }

            if (focusedOption.name === 'card-name') {
                const selectedSet = interaction.options.getString('set');
                //const selectedCard = interaction.options.getString('card-name');
                const userInput = focusedOption.value;

                // Fetch cards from MongoDB based on the selected set
                const cards = await getDatabase().collection('Cards').find({
                    'name': { $regex: userInput, $options: 'i' },
                    'set.name': selectedSet,
                }).toArray();

                // Load card names and numbers from 'cards' collection
                choices = cards.map(card => ({
                    name: `${card.name} - ${card.number}`,
                    value: `${card.name} - ${card.number}`,
                }));
                //console.log(selectedCard + selectedSet)
            }

            const filtered = choices.filter(choice => choice.name.startsWith(focusedOption.value));
            await interaction.respond( filtered.slice(0, 25));
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'An error occurred while fetching choices.', ephemeral: true });
        }
    }, 
    async execute(interaction) {
        try {
            // Retrieve the selected set and card name from user interaction
            const selectedSet = interaction.options.getString('set');
            const selectedCardNameNumber = interaction.options.getString('card-name');
            const amount = interaction.options.getInteger('amount');
            console.log(`Set: ${selectedSet} and Name/Number: ${selectedCardNameNumber}`);

            // Split the combined value into card name and number
            const [selectedCardName, selectedCardNumber] = selectedCardNameNumber.split(' - ');

            // Fetch card information from MongoDB based on the selected set, card name, and card number
            const cardInfo = await getDatabase().collection('Cards').findOne({
                'name': selectedCardName,
                'number': selectedCardNumber,
                'set.name': selectedSet,
            });

            console.log(cardInfo);
            console.log(cardInfo.tcgplayer.prices)
            const setInfo = await getDatabase().collection('Sets').findOne({ 'name': selectedSet})
            //console.log(setInfo);

            /// Get the server (guild) ID from the interaction
            const serverId = interaction.guild.id;

            // Dynamically create the collection name for server-specific user profiles
            const userProfileCollectionName = `server_${serverId}_userProfiles`;
            const userProfileCollection = getDatabase().collection(userProfileCollectionName);

            // Retrieve the user's ID from the interaction
            const userId = interaction.user.id;

            // Find the user profile in the database
            const userProfile = await userProfileCollection.findOne({ userId });

            if (userProfile) {
                // Check if the card is already in the user's cards array
                const existingCardIndex = userProfile.cards.findIndex(card => card.id === cardInfo.id);
              
                if (existingCardIndex !== -1) {
                  // If the card exists, update the amount
                  userProfile.cards[existingCardIndex].amount += amount;
                } else {
                  // If the card doesn't exist, add it to the cards array
                  userProfile.cards.push({ id: cardInfo.id, amount });
                }
              
                // Update the user profile in the database
                await userProfileCollection.updateOne(
                  { userId },
                  {
                    $set: {
                      cards: userProfile.cards,
                    },
                  }
                );
              } else {
                interaction.reply({
                  content: 'You do not have a profile. Use `/register` to register a profile!',
                  ephemeral: true,
                });
              }
            // Create an instance of EmbedBuilder
            const embed = new EmbedBuilder()
    .setColor('Green')
    .setTitle('Card Added to Collection')
    .setDescription(`Card: ${cardInfo.name}\nSet: ${cardInfo.set.name}\nCard Number: ${cardInfo.number}\nRarity: ${cardInfo.rarity}`)
    .setThumbnail(cardInfo.set.images.logo)
    .addFields(
        {
            name: 'Price',
            value: `Cardmarket AVG Price: €${cardInfo.cardmarket.prices.averageSellPrice ? cardInfo.cardmarket.prices.averageSellPrice.toString() : 'N/A'} | AVG 30-DAY: €${cardInfo.cardmarket.prices.avg30 ? cardInfo.cardmarket.prices.avg30.toString() : 'N/A'}`
        },
        {
            name: 'Price',
            value: `TCG Player AVG Price: ${
                cardInfo.tcgplayer.prices.firstEditionHolofoil && cardInfo.tcgplayer.prices.firstEditionHolofoil.market
                    ? `$${cardInfo.tcgplayer.prices.firstEditionHolofoil.market.toString()} (First Edition Holofoil)`
                    : cardInfo.tcgplayer.prices.unlimitedHolofoil && cardInfo.tcgplayer.prices.unlimitedHolofoil.market
                    ? `$${cardInfo.tcgplayer.prices.unlimitedHolofoil.market.toString()} (Unlimited Holofoil)`
                    : cardInfo.tcgplayer.prices.holofoil && cardInfo.tcgplayer.prices.holofoil.market
                    ? `$${cardInfo.tcgplayer.prices.holofoil.market.toString()} (Holofoil)`
                    : cardInfo.tcgplayer.prices.reverseHolofoil && cardInfo.tcgplayer.prices.reverseHolofoil.market
                    ? `$${cardInfo.tcgplayer.prices.reverseHolofoil.market.toString()} (Reverse Holofoil)`
                    : cardInfo.tcgplayer.prices.firstEditionNormal && cardInfo.tcgplayer.prices.firstEditionNormal.market
                    ? `$${cardInfo.tcgplayer.prices.firstEditionNormal.market.toString()} (First Edition Normal)`
                    : cardInfo.tcgplayer.prices.normal && cardInfo.tcgplayer.prices.normal.market
                    ? `$${cardInfo.tcgplayer.prices.normal.market.toString()} (Normal)`
                    : 'N/A'
            } | Market High: ${
                cardInfo.tcgplayer.prices.firstEditionHolofoil && cardInfo.tcgplayer.prices.firstEditionHolofoil.high
                    ? `$${cardInfo.tcgplayer.prices.firstEditionHolofoil.high.toString()} (First Edition Holofoil)`
                    : cardInfo.tcgplayer.prices.unlimitedHolofoil && cardInfo.tcgplayer.prices.unlimitedHolofoil.high
                    ? `$${cardInfo.tcgplayer.prices.unlimitedHolofoil.high.toString()} (Unlimited Holofoil)`
                    : cardInfo.tcgplayer.prices.holofoil && cardInfo.tcgplayer.prices.holofoil.high
                    ? `$${cardInfo.tcgplayer.prices.holofoil.high.toString()} (Holofoil)`
                    : cardInfo.tcgplayer.prices.reverseHolofoil && cardInfo.tcgplayer.prices.reverseHolofoil.high
                    ? `$${cardInfo.tcgplayer.prices.reverseHolofoil.high.toString()} (Reverse Holofoil)`
                    : cardInfo.tcgplayer.prices.firstEditionNormal && cardInfo.tcgplayer.prices.firstEditionNormal.high
                    ? `$${cardInfo.tcgplayer.prices.firstEditionNormal.high.toString()} (First Edition Normal)`
                    : cardInfo.tcgplayer.prices.normal && cardInfo.tcgplayer.prices.normal.high
                    ? `$${cardInfo.tcgplayer.prices.normal.high.toString()} (Normal)`
                    : 'N/A'
            }`
        }
    )
    .setImage(cardInfo.images.large);




            // Respond to the user with the embed
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.log(error)
        }
    }        
};  

