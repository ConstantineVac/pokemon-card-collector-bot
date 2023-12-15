const { getDatabase } = require("../database");

module.exports = {
    name: 'remove-cards',
    description: 'Remove a card from your collection',
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
            description: 'The name of the card to remove.',
            required: true,
            choices: [],
            autocomplete: true,
        },
        {
            name: 'amount',
            type: 4,
            description: 'How many copies to remove.',
            required: true,
        },
    ],
    async autocomplete(interaction) {
        try {
            if (!interaction.isAutocomplete()) return;

            const serverId = interaction.guild.id;

            // Dynamically create the collection name for server-specific user profiles
            const userProfileCollectionName = `server_${serverId}_userProfiles`;
            const userProfileCollection = getDatabase().collection(userProfileCollectionName);

            // Retrieve the user's ID from the interaction
            const userId = interaction.user.id;

            // Find the user profile in the database
            const userProfile = await userProfileCollection.findOne({ userId });

            const focusedOption = interaction.options.getFocused(true);
            let choices = [];

            if (userProfile) {
                if (focusedOption.name === 'set') {
                    let uniqueSetNames;
                    const userInput = focusedOption.value;
                    const userCardIds = userProfile.cards.map(card => card.id);
                    console.log(userCardIds)
                    // Query the 'Cards' collection to obtain unique set names for the user's cards
                    uniqueSetNames = await getUniqueSetNames(userCardIds);

                    // Format choices for autocomplete
                    choices = uniqueSetNames.map(setName => ({
                        name: setName,
                        value: setName,
                    }));
                } else if (focusedOption.name === 'card-name') {
                    // Fetch card details using card IDs
                    const cardDetails = await getCardDetails(userProfile.cards);
    
                    // Create choices using the retrieved card details
                    choices = cardDetails.map(card => ({
                        name: `${card.name} - ${card.number}`,
                        value: card.name,
                    }));
                }
            }  

            const filtered = choices.filter(choice => choice.name.startsWith(focusedOption.value));
            await interaction.respond( filtered.slice(0, 25));
        } catch (error) {
            console.log(error);
        }    
    }
}


// Function to get unique set names for a given array of card IDs
async function getUniqueSetNames(cardIds) {
    const CardsCollection = getDatabase().collection('Cards');

    try {
        // Query the 'Cards' collection for unique set names based on the provided card IDs
        const uniqueSets = await CardsCollection.distinct('set.name', { 'id': { $in: cardIds } });

        console.log('Unique Sets:', uniqueSets);

        return uniqueSets;
    } catch (error) {
        console.error('Error querying the database:', error);
        throw error; // Rethrow the error to handle it at a higher level
    }
}

// Function to fetch card details from the 'Cards' collection using card IDs
async function getCardDetails(userCards) {
    const CardsCollection = getDatabase().collection('Cards');

    try {
        // Extract card IDs from user's cards
        const cardIds = userCards.map(card => card.id);

        // Query the 'Cards' collection for details based on the provided card IDs
        const cardDetails = await CardsCollection.find({ 'id': { $in: cardIds } }).toArray();

        console.log('Card Details:', cardDetails);

        return cardDetails;
    } catch (error) {
        console.error('Error querying the database:', error);
        throw error; // Rethrow the error to handle it at a higher level
    }
}