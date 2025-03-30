import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { createCanvas } from 'canvas';
import { Chart } from 'chart.js';
import { ChartConfiguration, ChartTypeRegistry } from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { setInterval } from 'timers';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Function to fetch savings grants data
interface SavingsGrantsResponse {
    success: boolean;
    result: {
        grants: { savings: number }[];
    };
}

interface SavingsLeasesResponse {
    success: boolean;
    result: {
        leases: { savings: number }[];
    };
}

interface SavingsContractsResponse {
    success: boolean;
    result: {
        contracts: { savings: number }[];
    };
}

async function fetchSavingsGrants() {
    try {
        const grantsResponse = await axios.get<SavingsGrantsResponse>('https://api.doge.gov/savings/grants');
        const leasesResponse = await axios.get<SavingsLeasesResponse>('https://api.doge.gov/savings/leases');
        const contractsResponse = await axios.get<SavingsContractsResponse>('https://api.doge.gov/savings/contracts');

        const grants = grantsResponse.data.success ? grantsResponse.data.result?.grants ?? [] : [];
        const leases = leasesResponse.data.success ? leasesResponse.data.result?.leases ?? [] : [];
        const contracts = contractsResponse.data.success ? contractsResponse.data.result?.contracts ?? [] : [];

        return [
            ...grants.map(grant => grant.savings),
            ...leases.map(lease => lease.savings),
            ...contracts.map(contract => contract.savings),
        ];
    } catch (error) {
        console.error('Error fetching savings data:', error);
        throw error;
    }
}

// Function to perform Benford's Law analysis
interface BenfordsLawAnalysisResult {
    leadingDigitCounts: number[];
    percentages: number[];
}

function analyzeBenfordsLaw(data: number[]): number[] {
    const leadingDigitCounts: number[] = Array(9).fill(0);
    data.forEach((value: number) => {
        const leadingDigit: number = parseInt(value.toString()[0], 10);
        if (leadingDigit >= 1 && leadingDigit <= 9) {
            leadingDigitCounts[leadingDigit - 1]++;
        }
    });

    const total: number = leadingDigitCounts.reduce((sum: number, count: number) => sum + count, 0);
    return leadingDigitCounts.map((count: number) => (count / total) * 100);
}

async function passesBenfordsAnalysis(data: number[]): Promise<boolean> {
    const benfordsExpected = [30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6]; // Expected percentages for Benford's Law
    const tolerance = 5; // Allowable percentage deviation

    const actualPercentages = analyzeBenfordsLaw(data);

    console.log('Updated combined Benford\'s Law chart saved to combined_benfords_chart.png.');

    return actualPercentages.every((percentage, index) => {
        const expected = benfordsExpected[index];
        const deviation = Math.abs(percentage - expected);
        return deviation <= tolerance;
    });
}

// Function to generate a chart
interface GenerateChartData {
    data: number[];
}

async function generateChart(data: GenerateChartData['data']): Promise<Buffer> {
    const benfordsExpected = [30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6];

    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 600 });
    const configuration: ChartConfiguration<'bar' | 'line'> = {
        type: 'bar',
        data: {
            labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
            datasets: [
                {
                    label: 'DOGE Benford\'s Law Dist',
                    data,
                    backgroundColor: 'rgba(255, 215, 0, 0.2)', // Gold color with transparency
                    borderColor: 'rgba(255, 215, 0, 1)', // Solid gold color
                    borderWidth: 1,
                },
                {
                    label: 'Expected %',
                    data: benfordsExpected,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)', // White color with transparency
                    borderColor: 'rgba(255, 255, 255, 1)', // Solid white color
                    borderWidth: 1,
                    type: 'line', // Display as a line chart
                },
            ],
        },
        options: {
            scales: {
                x: {
                    display: true, // Show x-axis labels
                },
                y: {
                    display: true, // Show y-axis labels
                    beginAtZero: true,
                },
            },
        },
    };

    return await chartJSNodeCanvas.renderToBuffer(configuration);
}

// Main function to fetch data, analyze, and generate webpage
async function main() {
    try {
        const allSavings = await fetchSavingsGrants();

        // Perform Benford's Law analysis on combined data
        const combinedBenfordsData = analyzeBenfordsLaw(allSavings);

        // Check if the data passes Benford's analysis
        const passesAnalysis = await passesBenfordsAnalysis(allSavings);
        const benfordsExpected = [30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6];
        const actualPercentages = analyzeBenfordsLaw(allSavings);

        console.log(`Does the data pass Benford's analysis? ${passesAnalysis ? 'Yes' : 'No'}`);

        // Generate a single chart for combined data
        const combinedChartBuffer = await generateChart(combinedBenfordsData);

        // Save the chart to a file
        const combinedChartPath = path.join("C:\\Users\\jonnadul\\Development\\bfdoge\\combined_benfords_chart.png");
        fs.writeFileSync(combinedChartPath, combinedChartBuffer);

        // Generate HTML content
        const timestamp = new Date().toLocaleString();
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Benford's Law Analysis</title>
            <meta http-equiv="refresh" content="60">
            <style>
            body {
            background-color: black;
            color: gold;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            }
            .header {
            display: flex;
            align-items: center;
            gap: 10px;
            }
            .header img {
            height: 2em; /* Match the height of the text */
            width: auto;
            }
            table {
            margin-top: 20px;
            border-collapse: collapse;
            width: 80%;
            display: none; /* Initially hidden */
            }
            th, td {
            border: 1px solid gold;
            padding: 8px;
            text-align: center;
            }
            th {
            background-color: rgba(255, 215, 0, 0.2);
            }
            .toggle-button {
            margin-top: 20px;
            padding: 10px 20px;
            background-color: gold;
            color: black;
            border: none;
            cursor: pointer;
            font-size: 1em;
            }
            .toggle-button:hover {
            background-color: rgba(255, 215, 0, 0.8);
            }
            </style>
            </head>
            <body>
            <div class="header">
            <h1>Benford's Law Analysis of </h1>
            <img src="doge-icon.avif" alt="Doge Icon">
            </div>
            <img src="combined_benfords_chart.png" alt="Benford's Law Chart">
            <p>Does the data pass Benford's analysis? <strong>${passesAnalysis ? 'Yes' : 'No'}</strong></p>
            <p>Last Analysis: <strong>${timestamp}</strong></p>
            </body>
            </html>
        `;

        const htmlPath = path.join("C:\\Users\\jonnadul\\Development\\bfdoge\\index.html");
        fs.writeFileSync(htmlPath, htmlContent);

        console.log('Webpage and combined chart generated successfully. Open index.html to view the results.');
    } catch (error) {
        console.error('Error in main function:', error);
    }
}

async function periodicAnalysis() {
    try {
        console.log('Starting periodic Benford analysis...');
        await main();
        console.log('Periodic Benford analysis completed.');
    } catch (error) {
        console.error('Error during periodic Benford analysis:', error);
    }
}

// Run the analysis every minute (60000 milliseconds)
setInterval(periodicAnalysis, 60000);

// Run the first analysis immediately
periodicAnalysis();