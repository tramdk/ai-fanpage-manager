import { prisma } from '../config/prisma.js';
import * as aiService from './ai.service.js';
import * as postService from './post.service.js';

interface WorkflowNode {
  id: string;
  type: string;
  config: any;
  title: string;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export class WorkflowEngine {
  private nodes: WorkflowNode[] = [];
  private edges: WorkflowEdge[] = [];
  private executionState: Record<string, any> = {};
  private userId: string;

  constructor(userId: string, nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    this.userId = userId;
    this.nodes = nodes;
    this.edges = edges;
  }

  async run(inputData: any = {}) {
    this.executionState = { ...inputData };
    
    // Find trigger node
    const triggerNode = this.nodes.find(n => n.type === 'trigger');
    if (!triggerNode) throw new Error('No trigger node found in workflow');

    await this.executeNode(triggerNode);
    return this.executionState;
  }

  private async executeNode(node: WorkflowNode) {
    console.log(`[ENGINE] Executing Node: ${node.title} (${node.type})`);
    
    try {
      switch (node.type) {
        case 'ai_text':
          const textPrompt = node.config.prompt || `Write a post about ${this.executionState.topic || 'general topics'}`;
          const generatedText = await aiService.generateText(textPrompt);
          this.executionState.lastText = generatedText;
          break;

        case 'ai_image':
          const imgTopic = this.executionState.topic || 'marketing';
          const imageUrl = await aiService.generateImage(imgTopic);
          this.executionState.lastImage = imageUrl;
          break;

        case 'publish':
          if (this.executionState.lastText) {
            await postService.queuePost(this.userId, {
              topic: this.executionState.topic || 'Workflow Post',
              content: this.executionState.lastText,
              imageUrl: this.executionState.lastImage ? JSON.stringify([{ type: 'image', data: this.executionState.lastImage, id: Date.now().toString() }]) : null,
              fanpageId: node.config.pageId || this.executionState.selectedFanpage,
              status: 'queued'
            });
          }
          break;
          
        case 'delay':
          const minutes = parseInt(node.config.delayMinutes) || 5;
          console.log(`[ENGINE] Delaying for ${minutes} minutes... (Simulated)`);
          // In a real production system, this would trigger a delayed job/message queue
          break;
      }
    } catch (error) {
      console.error(`[ENGINE] Error in node ${node.id}:`, error);
      throw error;
    }

    // Find next nodes
    const outgoingEdges = this.edges.filter(e => e.source === node.id);
    for (const edge of outgoingEdges) {
      const nextNode = this.nodes.find(n => n.id === edge.target);
      if (nextNode) {
        await this.executeNode(nextNode);
      }
    }
  }
}
