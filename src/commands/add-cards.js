// addCards.js
const axios = require('axios');
const { getDatabase } = require('../database');
const pokemon = require('pokemontcgsdk'); // Import the library
const { EmbedBuilder } = require('discord.js');

// axios.get('https://api.pokemontcg.io/v2/sets/')
//   .then(response => {
//     const sets = response.data.data;
//     sets.forEach(set => {
//       const collection = getDatabase().collection('Sets');
//       collection.insertOne(set);

//       axios.get(`https://api.pokemontcg.io/v2/cards?q=set.id:${set.id}`)
//         .then(response => {
//           const cards = response.data.data;
//           cards.forEach(card => {
//             const collection = getDatabase().collection('Cards');
//             collection.findOne({ id: card.id }, function(err, result) {
//               if (err) throw err;
//               if (!result) {
//                 collection.insertOne(card);
//               }
//             });
//           });
//         })
//         .catch(error => {
//           console.error(error);
//         });
//     });
//   })
//   .catch(error => {
//     console.error(error);
//   });

pokemon.configure({ apiKey: process.env.POKEKEY });
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
            //console.log(cardInfo);
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
            .setImage(cardInfo.images.large); // Set the main image to the card's picture

            // Respond to the user with the embed
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.log(error)
        }
    }        
};  

