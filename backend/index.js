import { Client } from '@elastic/elasticsearch';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
    node: 'http://localhost:9200'
});

// Initialize sample data
async function initializeData() {
    try {
        await client.indices.create({
            index: 'sales',
            body: {
                mappings: {
                    properties: {
                        product: { type: 'keyword' },
                        category: { type: 'keyword' },
                        amount: { type: 'float' },
                        date: { type: 'date' },
                        region: { type: 'keyword' },
                        units: { type: 'integer' }
                    }
                }
            }
        });

        const sampleData = [
            { product: 'Laptop Pro', category: 'Electronics', amount: 1200, units: 5, region: 'North', date: '2023-05-15' },
            { product: 'Laptop Basic', category: 'Electronics', amount: 800, units: 10, region: 'South', date: '2023-05-16' },
            { product: 'Gaming Phone', category: 'Mobile', amount: 900, units: 8, region: 'East', date: '2023-05-17' },
            { product: 'Tablet Pro', category: 'Electronics', amount: 600, units: 12, region: 'West', date: '2023-05-18' },
            { product: 'Smart Watch', category: 'Wearables', amount: 300, units: 20, region: 'North', date: '2023-05-19' },
            { product: 'Wireless Earbuds', category: 'Audio', amount: 150, units: 30, region: 'South', date: '2023-05-20' },
            { product: 'Desktop PC', category: 'Electronics', amount: 1500, units: 3, region: 'West', date: '2023-05-21' },
            { product: 'Camera DSLR', category: 'Photography', amount: 750, units: 7, region: 'East', date: '2023-05-22' }
        ];

        for (const item of sampleData) {
            await client.index({
                index: 'sales',
                body: item
            });
        }
    } catch (error) {
        console.log('Index might already exist');
    }
}

initializeData();

app.get('/api/sales', async (req, res) => {
    try {
        const result = await client.search({
            index: 'sales',
            body: {
                query: {
                    match_all: {}
                }
            }
        });
        res.json(result.hits.hits.map(hit => hit._source));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const result = await client.search({
            index: 'sales',
            body: {
                size: 0,
                aggs: {
                    total_sales: { sum: { field: 'amount' } },
                    avg_sale: { avg: { field: 'amount' } },
                    total_units: { sum: { field: 'units' } },
                    by_category: {
                        terms: {
                            field: 'category',
                            size: 10,
                            order: { 'revenue': 'desc' }
                        },
                        aggs: {
                            revenue: { sum: { field: 'amount' } }
                        }
                    },
                    by_region: {
                        terms: {
                            field: 'region',
                            size: 10,
                            order: { 'revenue': 'desc' }
                        },
                        aggs: {
                            revenue: { sum: { field: 'amount' } }
                        }
                    }
                }
            }
        });

        // Transform data for better chart compatibility
        const transformedData = {
            ...result.aggregations,
            by_category: {
                buckets: result.aggregations.by_category.buckets.map(item => ({
                    name: item.key,
                    value: item.revenue.value
                }))
            },
            by_region: {
                buckets: result.aggregations.by_region.buckets.map(item => ({
                    name: item.key,
                    value: item.revenue.value
                }))
            }
        };

        res.json(transformedData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(5000, () => {
    console.log('Backend running on port 5000');
});
