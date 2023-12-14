// addCards.js
require('dotenv').config();
const axios = require('axios');
const { getDatabase } = require('../database');
const { EmbedBuilder } = require('discord.js');

const pokemon = require('pokemontcgsdk'); 
pokemon.configure({ apiKey: process.env.POKEKEY });

function getAllSets() {
    return pokemon.set.all()
      .then((sets) => {
        return Promise.all(sets.map((set) => {
          const collection = getDatabase().collection('Sets');
          return collection.insertOne(set)
            .then(() => set);
        }));
      });
  }
  
  function getAllCardsForSet(setId) {
    return pokemon.card.where({ q: `set.id:${setId}` })
      .then((response) => response.data);
  }
  
  function getCardIdsFromDatabase() {
    const cardCollection = getDatabase().collection('Cards');
    return cardCollection.find({}, { projection: { _id: 0, id: 1 } }).toArray()
      .then((cards) => cards.map((card) => card.id));
  }
  
  function insertMissingCards(cards, existingCardIds) {
    const cardCollection = getDatabase().collection('Cards');
  
    const missingCards = cards.filter((card) => !existingCardIds.includes(card.id));
  
    return Promise.all(missingCards.map((missingCard) => {
      return cardCollection.insertOne(missingCard);
    }));
  }
  
  // Start the process
  Promise.all([getAllSets(), getCardIdsFromDatabase()])
    .then(([sets, existingCardIds]) => {
      // For each set, fetch and insert missing cards
      return Promise.all(sets.map((set) => {
        return getAllCardsForSet(set.id)
          .then((cards) => insertMissingCards(cards, existingCardIds));
      }));
    })
    .then(() => {
      console.log('All sets and missing cards inserted successfully.');
    })
    .catch((error) => {
      console.error('Error:', error);
    });

module.exports = {
        name: 'add-cards',
        description: 'Add cards to your collection',
        options: [
            {
                name: 'set',
                type: 3,
                description: 'Name of the shop to manage',
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

                // Load card names from 'cards' collection
                choices = cards.map(card => ({ name: card.name, value: card.name }));
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
            const selectedCardName = interaction.options.getString('card-name');
            console.log(`Set: ${selectedSet} and Name: ${selectedCardName}`);
             // Fetch card information from MongoDB based on the selected set and card name
             const cardInfo = await getDatabase().collection('Cards').findOne({
                'name': selectedCardName,
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

            // Check if the user profile already exists
            const existingProfile = await userProfileCollection.findOne({ userId });


            // If the user profile exists, update it; otherwise, create a new one
            if (existingProfile) {
                // Update the existing user profile
                await userProfileCollection.updateOne(
                    { userId },
                    {
                        $set: {
                            cardName: cardInfo.name,
                            set: cardInfo.set.name,
                            cardNumber: cardInfo.number,
                            setPicture: setInfo.images.symbol,
                            cardPicture: cardInfo.images.large,
                        },
                    }
                );
            } else {
                interaction.reply({content: 'You do not have a profile. Use `/register` to register a profile !', ephemeral: true})
            }
            
            // Create an instance of EmbedBuilder
            const embed = new EmbedBuilder()
            .setColor('#0099ff') // You can set the color as needed
            .setTitle('Card Added to Collection')
            .setDescription(`Card: ${cardInfo.name}\nSet: ${cardInfo.set.name}\nCard Number: ${cardInfo.number}`)
            .setThumbnail(cardInfo.set.images.logo) // Set thumbnail to the set's picture
            .addFields(
                {
                    name: 'Price',
                    value: `Cardmarket AVG Price: €${cardInfo.cardmarket.prices.averageSellPrice ? cardInfo.cardmarket.prices.averageSellPrice.toString() : 'N/A'} | AVG 30-DAY: €${cardInfo.cardmarket.prices.avg30 ? cardInfo.cardmarket.prices.avg30.toString() : 'N/A'}`
                },
                {
                    name: 'Price',
                    value: `TCG Player AVG Price: $${cardInfo.tcgplayer.prices.holofoil.market ? cardInfo.tcgplayer.prices.holofoil.market.toString() : 'N/A'} | Market High: $${cardInfo.tcgplayer.prices.holofoil.high ? cardInfo.tcgplayer.prices.holofoil.high.toString() : 'N/A'}`
                }
            )
            .setImage(cardInfo.images.large); // Set the main image to the card's picture


            // Respond to the user with the embed
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.log(error)
        }
    }        
};  

