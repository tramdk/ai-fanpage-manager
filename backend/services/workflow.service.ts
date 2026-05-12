import { prisma } from '../config/prisma.js';
import * as aiService from './ai.service.js';
import * as postService from './post.service.js';
import * as autoreelsService from './autoreels.service.js';

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

    // Use existing schedule if provided (when called from Automation/Campaign view)
    // Otherwise create a new one (when called directly from Workflow view)
    if (this.executionState.scheduleId) {
      console.log(`[ENGINE] Reusing existing schedule: ${this.executionState.scheduleId}`);
    } else {
      const topic = this.executionState.topic || triggerNode.config.topic || 'Workflow Execution';
      
      // Try to get fanpageId from execution state or nodes
      let fanpageId = this.executionState.selectedFanpage;
      
      if (!fanpageId) {
        const publishNode = this.nodes.find(n => n.type === 'publish');
        fanpageId = publishNode?.config.pageId;
      }
      
      if (!fanpageId) {
        throw new Error('Vui lòng chọn Fanpage trong Node Publish trước khi chạy Workflow.');
      }

      const runCount = Number(triggerNode.config.runCount) || 1;
      const schedule = await prisma.schedule.create({
        data: {
          topic: `[WF] ${topic}`,
          time: triggerNode.config.time || '10:00',
          runCount: runCount,
          fanpageId, // This should match pageId in Fanpage model
          userId: this.userId,
          status: 'active'
        }
      });
      this.executionState.scheduleId = schedule.id;
      console.log(`[ENGINE] Created new execution schedule: ${schedule.id} with runCount: ${runCount}`);
    }

    await this.executeNode(triggerNode);
    return this.executionState;
  }

  private async executeNode(node: WorkflowNode) {
    console.log(`[ENGINE] Executing Node: ${node.title} (${node.type})`);
    
    try {
      // 1. Update global state with current node's config if it has a topic
      if (node.config.topic) this.executionState.topic = node.config.topic;

      switch (node.type) {
        case 'ai_text':
          const topic = node.config.topic || this.executionState.topic || 'general topics';
          const tone = node.config.tone || 'professional and elegant';
          const instructions = node.config.instructions || '';
          
          // Add iteration index to prompt for variety in batch runs
          const variationHint = this.executionState.iterationIndex !== undefined 
            ? `\nĐây là bài viết số ${this.executionState.iterationIndex + 1} trong chuỗi bài. Hãy viết nội dung khác biệt so với các bài trước.`
            : '';

          const textPrompt = node.config.prompt || `Đóng vai một chuyên gia Content Marketing và Copywriter đa năng, hãy viết một bài đăng mạng xã hội chất lượng cao, mang tính viral và tối ưu chuyển đổi về chủ đề: "${topic}".
            
            Tông giọng: ${tone}.
            ${instructions ? `Yêu cầu đặc biệt: ${instructions}` : ''}${variationHint}
            
            HƯỚNG DẪN LẬP DÀN Ý TỰ ĐỘNG (HÃY TỰ PHÂN TÍCH CHỦ ĐỀ ĐỂ CHỌN 1 TRONG 3 FORMAT SAU):

            1. NẾU CHỦ ĐỀ LÀ KIẾN THỨC, HỌC THUẬT, LÝ THUYẾT (Educational / Value-driven):
               - Tiêu đề (Hook): Khơi gợi sự tò mò hoặc đặt câu hỏi về một kiến thức/sự thật thú vị.
               - Dẫn dắt: Nhấn mạnh tầm quan trọng của kiến thức này.
               - Nội dung cốt lõi: Diễn giải lý thuyết một cách ĐƠN GIẢN, DỄ HIỂU nhất (dùng ví dụ thực tế hoặc ẩn dụ).
               - Ứng dụng: Kiến thức này giúp ích gì trong đời sống/công việc?
               - CTA: Khuyến khích lưu (save) bài viết, chia sẻ quan điểm hoặc đón đọc kỳ sau.

            2. NẾU CHỦ ĐỀ LÀ BÁN HÀNG, KHUYẾN MÃI, PROMO (Sales / Promotional):
               - Tiêu đề (Hook): Đánh thẳng vào lợi ích lớn nhất, chương trình ưu đãi, hoặc nỗi đau của khách hàng.
               - Vấn đề (Pain point): Khơi gợi lại khó khăn khách hàng đang gặp phải.
               - Giải pháp & Lợi ích (Solution/Benefits): Đưa ra sản phẩm/dịch vụ như một cứu cánh, làm nổi bật tính năng vượt trội (USP) và ưu đãi.
               - Cảm giác khan hiếm (Urgency): Đưa ra giới hạn thời gian/số lượng để thúc đẩy hành động nhanh.
               - CTA: Kêu gọi hành động mạnh mẽ, rõ ràng (Inbox ngay, Click link, Comment nhận tư vấn).

            3. NẾU CHỦ ĐỀ LÀ CÂU CHUYỆN, CHIA SẺ TRẢI NGHIỆM (Storytelling / Engagement):
               - Tiêu đề (Hook): Mở đầu bằng một câu nói ấn tượng, một cú sốc, hoặc một sự thật gây bất ngờ.
               - Diễn biến: Kể lại quá trình diễn ra sự việc (có khó khăn, có cao trào, có giải quyết).
               - Bài học đúc kết (Takeaway): Giá trị sâu sắc người đọc có thể học được.
               - CTA: Kêu gọi mọi người kể lại trải nghiệm tương tự của họ dưới phần bình luận.

            YÊU CẦU CHUNG QUAN TRỌNG:
            - Văn phong tự nhiên, gần gũi, nắm bắt đúng Insight người dùng Facebook Việt Nam.
            - Trình bày bài viết mạch lạc, ngắt đoạn ngắn gọn để dễ đọc trên thiết bị di động.
            - Cuối bài luôn có 3-5 hashtag phù hợp.
            - KHÔNG giải thích, KHÔNG xác nhận kiểu "Dưới đây là nội dung...", CHỈ TRẢ VỀ DUY NHẤT nội dung bài đăng.`;
            
          const generatedText = await aiService.generateText(textPrompt);
          this.executionState.lastText = generatedText;
          break;

        case 'ai_image':
          const imgTopic = node.config.topic || this.executionState.topic || 'marketing';
          const imageUrl = await aiService.generateImage(imgTopic);
          this.executionState.lastImage = imageUrl;
          break;

        case 'ai_video':
          const videoTopic = node.config.topic || this.executionState.topic || 'Video Content';
          const videoContent = this.executionState.lastText || 'Generated content';
          
          let videoPostId = this.executionState.currentPostId;
          
          if (!videoPostId) {
            // Create draft post if not exists
            const tempPost = await postService.queuePost(this.userId, {
              topic: videoTopic,
              content: videoContent,
              status: 'draft',
              scheduleId: this.executionState.scheduleId,
              imageUrl: this.executionState.lastImage ? JSON.stringify([{ type: 'image', data: this.executionState.lastImage, id: Date.now().toString() }]) : null
            });
            videoPostId = tempPost.id;
            this.executionState.currentPostId = videoPostId;
          }

          // Instead of calling autoreels immediately, we flag it for the router to batch
          this.executionState.needsVideo = true;
          this.executionState.videoOptions = {
            templateId: node.config.template || 'modern',
            ttsProvider: node.config.ttsProvider || 'edge',
            ttsVoiceId: node.config.ttsVoiceId || 'vi-VN-HoaiMyNeural',
            bgmAssetId: node.config.bgmAssetId || 'none'
          };
          
          console.log(`[ENGINE] Deferred video generation for post ${videoPostId}`);
          break;

        case 'publish':
          const pageId = node.config.pageId || this.executionState.selectedFanpage;
          if (!pageId) throw new Error('No Fanpage ID provided for publishing');

          const postData = {
            topic: this.executionState.topic || node.config.topic || 'Workflow Post',
            content: this.executionState.lastText || 'Workflow Content',
            imageUrl: this.executionState.lastImage ? JSON.stringify([{ type: 'image', data: this.executionState.lastImage, id: Date.now().toString() }]) : null,
            videoId: this.executionState.lastVideoId,
            fanpageId: pageId,
            scheduleId: this.executionState.scheduleId,
            orderIndex: this.executionState.iterationIndex || 0,
            status: 'queued'
          };

          if (this.executionState.currentPostId) {
            console.log(`[ENGINE] Updating existing post ${this.executionState.currentPostId} to queued status`);
            await prisma.post.update({
              where: { id: this.executionState.currentPostId },
              data: postData
            });
          } else {
            console.log(`[ENGINE] Creating new queued post`);
            const newPost = await postService.queuePost(this.userId, postData);
            this.executionState.currentPostId = newPost.id;
          }
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
