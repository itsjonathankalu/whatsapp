#!/usr/bin/env tsx
/**
 * Reliability Test for TickTick WhatsApp API
 * 
 * This is the test that actually matters - does the WhatsApp session stay stable?
 * Unit tests can't catch this. Only real-world monitoring can.
 */

import { config } from '../shared/lib/config';

interface TestConfig {
    apiUrl: string;
    apiKey: string;
    tenantId: string;
    testNumber?: string;
    duration: number; // in hours
    checkInterval: number; // in seconds
    messageInterval: number; // in minutes (0 = disable)
}

interface TestResult {
    timestamp: string;
    connected: boolean;
    responseTime: number;
    error?: string;
}

class ReliabilityTester {
    private config: TestConfig;
    private results: TestResult[] = [];
    private startTime: number;
    private successCount = 0;
    private failureCount = 0;

    constructor(testConfig: TestConfig) {
        this.config = testConfig;
        this.startTime = Date.now();
    }

    async run(): Promise<void> {
        console.log('🔄 Starting TickTick WhatsApp API Reliability Test');
        console.log(`⏱️  Duration: ${this.config.duration} hours`);
        console.log(`📊 Check interval: ${this.config.checkInterval}s`);
        console.log(`📨 Message interval: ${this.config.messageInterval}m (0=disabled)`);
        console.log(`🎯 Target: ${this.config.apiUrl}`);
        console.log('');

        const endTime = this.startTime + (this.config.duration * 60 * 60 * 1000);
        let lastMessageTime = 0;

        while (Date.now() < endTime) {
            const result = await this.checkHealth();
            this.results.push(result);

            if (result.connected) {
                this.successCount++;
                console.log(`✅ ${result.timestamp} - Connected (${this.successCount} checks, ${result.responseTime}ms)`);

                // Send test message periodically
                if (this.config.messageInterval > 0 && this.config.testNumber) {
                    const now = Date.now();
                    if (now - lastMessageTime >= this.config.messageInterval * 60 * 1000) {
                        await this.sendTestMessage();
                        lastMessageTime = now;
                    }
                }
            } else {
                this.failureCount++;
                console.log(`❌ ${result.timestamp} - Disconnected! (${this.failureCount} failures) - ${result.error}`);
            }

            // Print progress every 100 checks
            if ((this.successCount + this.failureCount) % 100 === 0) {
                this.printProgress();
            }

            await this.sleep(this.config.checkInterval * 1000);
        }

        this.printFinalReport();
    }

    private async checkHealth(): Promise<TestResult> {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();

        try {
            const response = await fetch(`${this.config.apiUrl}/health`, {
                signal: AbortSignal.timeout(10000) // 10s timeout
            });

            const responseTime = Date.now() - startTime;

            if (!response.ok) {
                return {
                    timestamp,
                    connected: false,
                    responseTime,
                    error: `HTTP ${response.status}`
                };
            }

            const data = await response.json();
            const hasConnectedClient = data.clients?.some((c: any) => c.connected) || false;

            return {
                timestamp,
                connected: hasConnectedClient,
                responseTime
            };

        } catch (error) {
            return {
                timestamp,
                connected: false,
                responseTime: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private async sendTestMessage(): Promise<void> {
        try {
            const response = await fetch(`${this.config.apiUrl}/api/v1/messages/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.config.apiKey,
                    'X-Tenant-Id': this.config.tenantId
                },
                body: JSON.stringify({
                    to: this.config.testNumber,
                    message: `🔍 Reliability test - ${new Date().toLocaleTimeString()}`
                }),
                signal: AbortSignal.timeout(30000)
            });

            if (response.ok) {
                console.log(`📨 Test message sent successfully`);
            } else {
                console.log(`⚠️  Failed to send test message: HTTP ${response.status}`);
            }
        } catch (error) {
            console.log(`⚠️  Failed to send test message: ${error}`);
        }
    }

    private printProgress(): void {
        const total = this.successCount + this.failureCount;
        const uptime = ((this.successCount / total) * 100).toFixed(2);
        const elapsed = (Date.now() - this.startTime) / (1000 * 60 * 60);

        console.log('');
        console.log(`📊 Progress Report - ${elapsed.toFixed(1)}h elapsed`);
        console.log(`   Uptime: ${uptime}% (${this.successCount}/${total} checks)`);
        console.log(`   Failures: ${this.failureCount}`);
        console.log('');
    }

    private printFinalReport(): void {
        const total = this.successCount + this.failureCount;
        const uptime = total > 0 ? ((this.successCount / total) * 100).toFixed(2) : '0';
        const avgResponseTime = this.results
            .filter(r => r.connected)
            .reduce((sum, r) => sum + r.responseTime, 0) / Math.max(this.successCount, 1);

        console.log('');
        console.log('🏁 FINAL RELIABILITY REPORT');
        console.log('================================');
        console.log(`Duration: ${this.config.duration} hours`);
        console.log(`Total checks: ${total}`);
        console.log(`Successful: ${this.successCount}`);
        console.log(`Failed: ${this.failureCount}`);
        console.log(`Uptime: ${uptime}%`);
        console.log(`Avg response time: ${avgResponseTime.toFixed(0)}ms`);
        console.log('');

        if (parseFloat(uptime) >= 99) {
            console.log('🎉 EXCELLENT - API is rock solid!');
        } else if (parseFloat(uptime) >= 95) {
            console.log('✅ GOOD - API is stable with minor issues');
        } else if (parseFloat(uptime) >= 90) {
            console.log('⚠️  CONCERNING - API has stability issues');
        } else {
            console.log('❌ POOR - API is unreliable, investigate immediately');
        }

        // Save detailed results
        const report = {
            config: this.config,
            summary: {
                total,
                successful: this.successCount,
                failed: this.failureCount,
                uptime: parseFloat(uptime),
                avgResponseTime: Math.round(avgResponseTime)
            },
            results: this.results
        };

        require('fs').writeFileSync(
            `reliability-report-${new Date().toISOString().split('T')[0]}.json`,
            JSON.stringify(report, null, 2)
        );

        console.log('📄 Detailed report saved to reliability-report-*.json');
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);

    const testConfig: TestConfig = {
        apiUrl: process.env.API_URL || 'http://localhost:3000',
        apiKey: process.env.API_KEY || 'change-me-in-production',
        tenantId: process.env.TENANT_ID || 'reliability-test',
        testNumber: process.env.TEST_NUMBER,
        duration: parseFloat(args.find(arg => arg.startsWith('--duration='))?.split('=')[1] || '24'),
        checkInterval: parseInt(args.find(arg => arg.startsWith('--interval='))?.split('=')[1] || '60'),
        messageInterval: parseInt(args.find(arg => arg.startsWith('--messages='))?.split('=')[1] || '0')
    };

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
TickTick WhatsApp API Reliability Tester

Usage: tsx src/tools/reliability-test.ts [options]

Options:
  --duration=HOURS     Test duration in hours (default: 24)
  --interval=SECONDS   Check interval in seconds (default: 60)
  --messages=MINUTES   Send test message every N minutes (default: 0 = disabled)
  --help, -h           Show this help

Environment Variables:
  API_URL              API base URL (default: http://localhost:3000)
  API_KEY              API key for authentication
  TENANT_ID            Tenant ID to use (default: reliability-test)
  TEST_NUMBER          Phone number for test messages (optional)

Examples:
  # Quick 4-hour test
  tsx src/tools/reliability-test.ts --duration=4

  # Intensive test with messaging
  TEST_NUMBER=5511999887766 tsx src/tools/reliability-test.ts --duration=24 --messages=60

  # Fast monitoring
  tsx src/tools/reliability-test.ts --duration=1 --interval=10
        `);
        return;
    }

    const tester = new ReliabilityTester(testConfig);
    await tester.run();
}

if (require.main === module) {
    main().catch(console.error);
} 