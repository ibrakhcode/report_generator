import { NextResponse } from 'next/server';

const serverStartTime = Date.now();

export async function GET() {
  const memory = process.memoryUsage();
  return NextResponse.json({
    status: 'healthy',
    service: 'Logics AI & HESU Management System',
    uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
    memory: {
      rssMb: Math.round(memory.rss / 1024 / 1024),
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024)
    },
    timestamp: new Date().toISOString()
  });
}
