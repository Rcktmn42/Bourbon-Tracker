// backend/controllers/warehouseReportController.js - Static JSON File Server

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - reports directory
const DEV_MODE = process.env.NODE_ENV !== 'production';
const REPORTS_DIR = DEV_MODE 
    ? path.join(__dirname, '../../warehouse-reports')
    : '/opt/warehouse-reports';

// Validate time period parameter
const VALID_TIME_PERIODS = ['current_month', 'last_30_days', 'last_90_days', 'last_180_days'];

// Serve warehouse inventory reports from pre-generated JSON files
export async function getWarehouseInventoryReport(req, res) {
    try {
        const { timePeriod = 'current_month' } = req.query;

        console.log(`Warehouse report request:`, { timePeriod });

        // Validate time period
        if (!VALID_TIME_PERIODS.includes(timePeriod)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid time period: ${timePeriod}. Valid options: ${VALID_TIME_PERIODS.join(', ')}` 
            });
        }

        // Load the pre-generated JSON file
        const reportFile = path.join(REPORTS_DIR, `warehouse_inventory_${timePeriod}.json`);
        
        let reportData;
        let fileStats;
        try {
            const fileContent = await fs.readFile(reportFile, 'utf8');
            fileStats = await fs.stat(reportFile);
            reportData = JSON.parse(fileContent);
        } catch (fileError) {
            console.error(`Failed to load report file: ${reportFile}`, fileError);
            
            // Return helpful error message
            if (fileError.code === 'ENOENT') {
                return res.status(404).json({
                    success: false,
                    error: `Report not available for ${timePeriod}. Please wait for next report generation.`,
                    details: DEV_MODE ? `File not found: ${reportFile}` : undefined
                });
            } else {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to load warehouse inventory report',
                    details: DEV_MODE ? fileError.message : undefined
                });
            }
        }

        // Generate ETag for caching
        const etag = `"${fileStats.mtime.getTime()}-${fileStats.size}"`;
        
        // Check if client has cached version
        const clientEtag = req.headers['if-none-match'];
        if (clientEtag === etag) {
            return res.status(304).end(); // Not Modified
        }

        // Set caching headers (4 hours to match frontend cache)
        res.setHeader('Cache-Control', 'public, max-age=14400'); // 4 hours
        res.setHeader('ETag', etag);
        res.setHeader('Last-Modified', fileStats.mtime.toUTCString());

        // Return complete dataset - NO server-side filtering
        const response = {
            success: true,
            products: reportData.products || [],
            meta: {
                generated_at: reportData.generated_at,
                report_type: reportData.report_type,
                time_period: reportData.time_period,
                total_products: (reportData.products || []).length,
                file_size: fileStats.size,
                file_modified: fileStats.mtime.toISOString(),
                cache_headers_set: true,
                source: 'pre_generated_json_full',
                summary: reportData.summary || {}
            }
        };

        console.log(`Served full report (${response.meta.total_products} products) for ${timePeriod}`);
        res.json(response);

    } catch (error) {
        console.error('Error serving warehouse inventory report:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load warehouse inventory report',
            details: DEV_MODE ? error.message : undefined
        });
    }
}

// Get report status and metadata
export async function getReportStatus(req, res) {
    try {
        const indexFile = path.join(REPORTS_DIR, 'reports_index.json');
        
        let indexData = {};
        try {
            const indexContent = await fs.readFile(indexFile, 'utf8');
            indexData = JSON.parse(indexContent);
        } catch (error) {
            console.warn('Could not load reports index:', error.message);
        }

        // Check which individual report files exist
        const reportAvailability = {};
        for (const timePeriod of VALID_TIME_PERIODS) {
            const reportFile = path.join(REPORTS_DIR, `warehouse_inventory_${timePeriod}.json`);
            try {
                await fs.access(reportFile);
                reportAvailability[timePeriod] = true;
                
                // Try to get file stats
                try {
                    const stats = await fs.stat(reportFile);
                    reportAvailability[`${timePeriod}_last_modified`] = stats.mtime;
                } catch (e) {
                    // Ignore stat errors
                }
            } catch (error) {
                reportAvailability[timePeriod] = false;
            }
        }

        res.json({
            success: true,
            reports_directory: REPORTS_DIR,
            development_mode: DEV_MODE,
            available_reports: indexData.available_reports || {},
            file_availability: reportAvailability,
            valid_time_periods: VALID_TIME_PERIODS,
            index_generated_at: indexData.generated_at,
            server_time: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error getting report status:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get report status',
            details: DEV_MODE ? error.message : undefined
        });
    }
}

// Admin endpoint: Manually trigger Python report generation (if needed)
export async function triggerReportGeneration(req, res) {
    try {
        const { reportTypes } = req.body;
        const requestedBy = req.user ? `${req.user.first_name} ${req.user.last_name} (${req.user.email})` : 'Admin';

        console.log(`Manual report generation requested by: ${requestedBy}`, { reportTypes });

        // Validate report types if specified
        if (reportTypes && Array.isArray(reportTypes)) {
            const invalidTypes = reportTypes.filter(type => !VALID_TIME_PERIODS.includes(type));
            
            if (invalidTypes.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid report types: ${invalidTypes.join(', ')}. Valid types: ${VALID_TIME_PERIODS.join(', ')}`
                });
            }
        }

        // Execute Python script
        const { spawn } = await import('child_process');
        const pythonScript = DEV_MODE 
            ? path.join(__dirname, '../../warehouse_inventory_generator.py')
            : '/opt/bourbon-scripts/warehouse_inventory_generator.py';

        const args = reportTypes && reportTypes.length > 0 ? reportTypes : [];
        
        const pythonProcess = spawn('python3', [pythonScript, ...args], {
            cwd: DEV_MODE ? path.join(__dirname, '../..') : '/opt',
            env: { 
                ...process.env, 
                DEV_MODE: DEV_MODE ? 'true' : 'false' 
            }
        });

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                console.log('Python report generation completed successfully');
                res.json({
                    success: true,
                    message: 'Report generation completed successfully',
                    output: output.trim(),
                    requested_by: requestedBy
                });
            } else {
                console.error('Python report generation failed with code:', code);
                console.error('Error output:', errorOutput);
                res.status(500).json({
                    success: false,
                    error: `Report generation failed with exit code: ${code}`,
                    output: errorOutput.trim()
                });
            }
        });

    } catch (error) {
        console.error('Error triggering report generation:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to trigger report generation',
            details: DEV_MODE ? error.message : undefined
        });
    }
}