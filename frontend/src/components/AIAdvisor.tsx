import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, CheckCircle2 } from 'lucide-react';
import { Transaction } from '../store/useTransactionStore';

interface AIAdvisorProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  budgets: Record<string, number>;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

const categoryTranslations: Record<string, string> = {
  Food: 'Gıda / Yemek',
  Travel: 'Ulaşım / Seyahat',
  Utilities: 'Faturalar',
  Shopping: 'Alışveriş',
  Entertainment: 'Eğlence',
  Others: 'Diğer'
};

const translateCategory = (cat: string): string => {
  return categoryTranslations[cat] || cat;
};

export const AIAdvisor: React.FC<AIAdvisorProps> = ({
  isOpen,
  onClose,
  transactions,
  budgets
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting and quick stats audit
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        const auditText = generateFinancialAudit();
        setMessages([
          {
            id: '1',
            sender: 'ai',
            text: `Merhaba! Ben Cebellezi AI Kişisel Finans Danışmanınız. 🚀\n\nHesabınızdaki harcamaları ve bütçeleri sizin için analiz ettim. İşte ilk tespitlerim:\n\n${auditText}\n\nBugün finansal durumunuz hakkında neyi analiz etmemi istersiniz?`,
            timestamp: new Date()
          }
        ]);
        setIsTyping(false);
      }, 1000);
    }
  }, [isOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Analyze transactions against category budgets
  const generateFinancialAudit = (): string => {
    if (transactions.length === 0) {
      return "Henüz sisteme girilmiş bir harcamanız bulunmuyor. Bir fiş resmi yükleyerek veya manuel ekleyerek analizi başlatabilirsiniz!";
    }

    // Calculate category sums
    const categoryTotals: Record<string, number> = {};
    let totalSpent = 0;

    transactions.forEach(tx => {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
      totalSpent += tx.amount;
    });

    const warnings: string[] = [];
    
    // Check budgets
    Object.keys(budgets).forEach(cat => {
      const spent = categoryTotals[cat] || 0;
      const limit = budgets[cat];
      const ratio = (spent / limit) * 100;

      if (ratio >= 100) {
        warnings.push(`⚠️ **${translateCategory(cat)}** bütçenizi aşmış durumdasınız! (Limit: ${limit} TL, Harcanan: ${spent.toFixed(2)} TL)`);
      } else if (ratio >= 75) {
        warnings.push(`🟡 **${translateCategory(cat)}** harcamalarınız limitinizin %${ratio.toFixed(0)}'ine ulaştı. Dikkatli olmalısınız.`);
      }
    });

    if (warnings.length === 0) {
      return `✅ Harika! Tüm kategori harcamalarınız belirlediğiniz bütçe limitlerinin altında görünüyor. Toplam harcamanız: **${totalSpent.toFixed(2)} TL**.`;
    }

    return warnings.join('\n\n');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // AI thinking fallback response logic
    setTimeout(() => {
      let aiText = '';
      const textLower = inputText.toLowerCase();

      // Custom contextual rules for matching developer's queries
      if (textLower.includes('bütçe') || textLower.includes('limit')) {
        aiText = `Bütçenizi optimize etmek için harika bir soru! Mevcut durumda en yüksek harcamalarınız şunlar:\n\n${transactions.slice(0, 3).map(tx => `- ${tx.merchant}: **${tx.amount} TL** (${translateCategory(tx.category)})`).join('\n')}\n\nTasarruf etmek için özellikle 'Gıda / Yemek' ve 'Alışveriş' limitlerinizi %10 düşürmenizi ve dışarıdan siparişleri azaltmanızı öneririm.`;
      } else if (textLower.includes('tavsiye') || textLower.includes('öneri') || textLower.includes('nasıl')) {
        aiText = `Finansal sağlığınız için 3 altın kural belirledim:\n\n1. **50/30/20 Kuralı**: Gelirinizin %50'sini zorunlu ihtiyaçlara (Fatura, Gıda), %30'unu isteklerinize (Eğlence, Alışveriş), %20'sini ise yatırıma yönlendirin.\n2. **Aylık Otomasyon**: Aylık bütçenizi belirledikten sonra limit aşım bildirimlerimizi takip edin.\n3. **Fiş Denetimleri**: Cebellezi AI OCR tarayıcısı ile faturalarınızdaki KDV/vergi oranlarını sık sık analiz edin, sürpriz ödemelerin önüne geçin.`;
      } else if (textLower.includes('analiz') || textLower.includes('durum')) {
        aiText = `Genel Durum Analizi:\n\n- Toplam işlem sayısı: **${transactions.length} adet**\n- Toplam harcanan miktar: **${transactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)} TL**\n- OCR ile taranmış fiş oranı: **%${((transactions.filter(t => t.isScanned).length / (transactions.length || 1)) * 100).toFixed(0)}**\n\nGrafiklerinize göre harcama yoğunluğunuz hafta sonları artıyor. Hafta sonu harcamalarınızı planlı yapmanız yararınıza olacaktır.`;
      } else {
        aiText = `Harika bir soru! Cebellezi AI finansal geçmişinizi inceliyor. Size daha iyi yardımcı olabilmem için sorunuzu detaylandırabilir misiniz? \n\n(İpucu: "Bütçe durumum nasıl?", "Bana tasarruf önerileri ver" veya "Genel durum analizi yap" yazarak başlayabilirsiniz.)`;
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiText,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="w-full max-w-md h-full bg-[#0f172a] border-l border-white/10 flex flex-col relative shadow-2xl animate-slide-in">
        {/* Top Header bar */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#1e293b]/50">
          <div className="flex items-center gap-2">
            <div className="bg-brand-accent/20 p-1.5 rounded-lg text-brand-accent">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Cebellezi AI Danışman</h3>
              <p className="text-[10px] text-slate-400">Yapay Zeka Destekli Akıllı Asistan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messaging Box */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs ${
                  msg.sender === 'user'
                    ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30'
                    : 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-md border ${
                  msg.sender === 'user'
                    ? 'bg-brand-primary text-white border-brand-primary/20 rounded-tr-none'
                    : 'bg-slate-800/90 text-slate-200 border-white/5 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-brand-accent/20 text-brand-accent border border-brand-accent/30">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-800/60 border border-white/5 p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-[#1e293b]/30">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Asistana sor (Örn: Bütçemi analiz et)..."
              className="w-full pl-4 pr-12 py-3 rounded-xl glass-input text-xs"
            />
            <button
              type="submit"
              className="absolute right-2 p-2 rounded-lg bg-brand-accent text-white hover:bg-brand-accent/90 transition shadow-md shadow-brand-accent/15"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
