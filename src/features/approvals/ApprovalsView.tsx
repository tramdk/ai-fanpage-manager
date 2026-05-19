import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Edit3, Image as ImageIcon, Video, FileText, Clock } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { ApiService } from '../../api';
import { toast } from 'sonner';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';

interface PendingApproval {
  id: string;
  workflowName: string;
  type: 'post' | 'image' | 'video';
  content: {
    text?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
  };
  createdAt: string;
}

export const ApprovalsView: React.FC<{ api: ApiService }> = ({ api }) => {
  const { t } = useLanguage();
  const [items, setItems] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'post' | 'image' | 'video'>('all');

  useEffect(() => {
    const fetchApprovals = async () => {
      setLoading(true);
      try {
        // Mock data for demonstration
        const mockData: PendingApproval[] = [
          {
            id: '1',
            workflowName: 'Daily Tech News',
            type: 'post',
            content: { text: 'AI is changing the world as we know it! Check out our latest post about the future of automation.' },
            createdAt: new Date().toISOString()
          },
          {
            id: '2',
            workflowName: 'Fashion Campaign',
            type: 'image',
            content: { 
              text: 'Summer Vibes 2026', 
              mediaUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=400',
              mediaType: 'image'
            },
            createdAt: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: '3',
            workflowName: 'Product Launch Video',
            type: 'video',
            content: { 
              text: 'The new SuperWidget is here!', 
              mediaUrl: 'https://res.cloudinary.com/demo/video/upload/c_scale,w_400/dog.mp4',
              mediaType: 'video'
            },
            createdAt: new Date(Date.now() - 7200000).toISOString()
          }
        ];
        setItems(mockData);
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    };
    fetchApprovals();
  }, []);

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    setItems(prev => prev.filter(item => item.id !== id));
    if (action === 'approve') {
      toast.success(t('approvedSuccess') || 'Nội dung đã được duyệt để đăng!');
    } else {
      toast.error(t('rejectedSuccess') || 'Đã loại bỏ nội dung khỏi hàng đợi.');
    }
  };

  const filteredItems = items.filter(item => filter === 'all' || item.type === filter);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Clock className="size-12 text-[#2563EB] dark:text-blue-400 animate-spin" />
        <p className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400 uppercase">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-gray-100 er leading-none">{t('approvalsTitle') || 'Approval Center'}</h2>
          <p className="text-sm font-bold text-[#6B7280] dark:text-gray-400 mt-3 uppercase opacity-60">Review generated content before publishing</p>
        </div>
        
        <Tabs value={filter} onValueChange={(val) => setFilter(val as any)}>
          <TabsList className="bg-transparent border border-white/5 bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-1.5 rounded-lg h-auto flex gap-1">
            {(['all', 'post', 'image', 'video'] as const).map((f) => (
              <TabsTrigger
                key={f}
                value={f}
                className="px-6 py-2.5 rounded-xl text-[9px] font-bold uppercase transition-all data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
              >
                {f}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col gap-8">
        {filteredItems.length === 0 ? (
          <Empty className="bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg p-20 rounded-xl border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon"><CheckCircle2 className="text-emerald-500" /></EmptyMedia>
              <EmptyTitle className="text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.2em]">Queue Clean</EmptyTitle>
              <EmptyDescription className="text-[10px] font-bold text-[#6B7280] dark:text-gray-400/60 uppercase mt-1">No items pending in your approval queue.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          filteredItems.map((item) => (
            <Card key={item.id} className="nm-flat rounded-xl overflow-hidden border-0 group hover:scale-[1.005] transition-all duration-500">
              <div className="flex flex-col lg:flex-row">
                {/* Media Preview */}
                {item.content.mediaUrl ? (
                  <div className="lg:w-80 w-full h-64 lg:h-auto bg-slate-950 flex items-center justify-center relative overflow-hidden shrink-0">
                    {item.content.mediaType === 'video' ? (
                      <video src={item.content.mediaUrl} className="w-full h-full object-cover opacity-80" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                    ) : (
                      <img src={item.content.mediaUrl} alt="Preview" className="w-full h-full object-cover opacity-90" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 nm-flat p-3 rounded-xl text-white">
                      {item.content.mediaType === 'video' ? <Video className="size-[18px]" /> : <ImageIcon className="size-[18px]" />}
                    </div>
                  </div>
                ) : (
                  <div className="lg:w-80 w-full h-64 lg:h-auto bg-[#F3F4F6] dark:bg-white/8 border border-[#D1D5DB] dark:border-white/12 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="size-12 text-[#2563EB] dark:text-blue-400/20" />
                  </div>
                )}

                {/* Content Details */}
                <div className="flex-grow p-8 lg:p-12 flex flex-col justify-between gap-10">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap items-center gap-4">
                      <Badge variant="secondary" className="px-4 py-1.5 rounded-xl text-[9px] font-bold text-[#2563EB] dark:text-blue-400 uppercase">{item.workflowName}</Badge>
                      <span className="text-[9px] font-bold text-[#6B7280] dark:text-gray-400 uppercase flex items-center gap-2">
                        <Clock className="size-3" />
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                       <p className="text-lg font-bold text-[#111827] dark:text-gray-100 leading-relaxed line-clamp-3">
                         {item.content.text}
                       </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    <Separator className="opacity-10" />
                    <div className="flex flex-wrap items-center gap-4">
                      <Button onClick={() => handleAction(item.id, 'approve')} className="flex-1 min-w-[140px] bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white py-5 rounded-xl text-[10px] font-bold uppercase h-auto transition-all">
                        <CheckCircle2 data-icon="inline-start" />
                        Approve
                      </Button>
                      <Button onClick={() => handleAction(item.id, 'reject')} variant="destructive" className="flex-1 min-w-[140px] bg-soft-pink/10 text-soft-pink hover:bg-soft-pink hover:text-white py-5 rounded-xl text-[10px] font-bold uppercase h-auto transition-all">
                        <XCircle data-icon="inline-start" />
                        Reject
                      </Button>
                      <Button variant="outline" size="icon" className="size-14 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-gray-400 hover:text-[#2563EB] dark:text-blue-400 transition-colors">
                        <Edit3 className="size-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
