import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { WorkflowEngine } from '../services/workflow.service.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get workflows for current user
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// Get a specific workflow
router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: req.params.id }
    });
    
    if (!workflow || workflow.userId !== req.user.id) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// Create or save workflow
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const { id, name, description, nodesData, edgesData } = req.body;
    
    let workflow;
    
    if (id) {
      // Update existing
      workflow = await prisma.workflow.findUnique({ where: { id } });
      if (workflow && workflow.userId === req.user.id) {
        workflow = await prisma.workflow.update({
          where: { id },
          data: {
            name: name || workflow.name,
            description: description !== undefined ? description : workflow.description,
            nodesData: nodesData || workflow.nodesData,
            edgesData: edgesData || workflow.edgesData,
          }
        });
      }
    } else {
      // Create new
      workflow = await prisma.workflow.create({
        data: {
          name: name || 'New Workflow',
          description: description || '',
          nodesData: nodesData || '[]',
          edgesData: edgesData || '[]',
          userId: req.user.id
        }
      });
    }
    
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save workflow' });
  }
});

// Execute Workflow (Real Engine)
router.post('/:id/execute', authenticateToken, async (req: any, res) => {
  try {
    const workflow = await prisma.workflow.findUnique({ where: { id: req.params.id } });
    if (!workflow || workflow.userId !== req.user.id) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const nodes = JSON.parse(workflow.nodesData || '[]');
    const edges = JSON.parse(workflow.edgesData || '[]');

    const engine = new WorkflowEngine(req.user.id, nodes, edges);
    
    // Pass execution parameters from body if any
    const result = await engine.run(req.body);

    res.json({ 
      success: true, 
      message: 'Workflow executed successfully', 
      result: {
        textGenerated: !!result.lastText,
        imageGenerated: !!result.lastImage
      }
    });
  } catch (error: any) {
    console.error('[WORKFLOW ROUTE ERROR]', error);
    res.status(500).json({ error: error.message || 'Failed to execute workflow' });
  }
});

export default router;
