import prisma from "../config/database";
import { Request, Response } from 'express';

export const getHealthStatus = async ( req: Request, res: Response ) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Database connection health endpoint
export const getDatabaseHealth = async ( req: Request, res: Response ) => {
  try {
    const result = await prisma.$queryRaw`SELECT version()`;
    res.json({ 
      status: 'OK', 
      database: 'connected',
      version: result 
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR', 
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}