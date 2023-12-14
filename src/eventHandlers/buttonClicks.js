module.exports = async (interaction) => {
    // Extract action and new page number from the button custom id
    
    console.log(`Custom ID : ${interaction.customId}`)
    let [action, newPage, targetUser , inventoryType] = interaction.customId.split('_');
    console.log([action,  newPage, targetUser, inventoryType]);
    if (action === 'previousPageCollection' || action === 'nextPageCollection') {
        // Call the 'recipe' command with the new page number
        interaction.client.commands.get('collection').execute(interaction, parseInt(newPage));
    }    
};    