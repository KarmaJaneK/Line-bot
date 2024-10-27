require('dotenv').config();
const axios = require('axios');

const airtableBase = () => {
    const config = {
        headers: {
            Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`
        }
    };

    console.log('AIRTABLE_PERSONAL_ACCESS_TOKEN:', process.env.AIRTABLE_API_KEY);
    console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID);
    console.log('AIRTABLE_TABLE_ID:', process.env.AIRTABLE_TABLE_ID);

    return {
        select: () => ({
            all: async () => {
                try {
                    const response = await axios.get(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}`, config);

                    // Access the correct property for records
                    const records = response.data.records;

                    // Log the records to check if they are being fetched correctly
                    console.log('Fetched Records:', records);

                    return records; // Return the records
                } catch (error) {
                    if (error.response) {
                        console.error('Error response from Airtable:', error.response.data);
                        console.error('Status code:', error.response.status);
                        console.error('Headers:', error.response.headers);
                    } else if (error.request) {
                        console.error('No response received from Airtable:', error.request);
                    } else {
                        console.error('Error setting up the request:', error.message);
                    }
                    console.error('Config:', error.config);
                    throw error;
                }
            }
        })
    };
};

module.exports = airtableBase;