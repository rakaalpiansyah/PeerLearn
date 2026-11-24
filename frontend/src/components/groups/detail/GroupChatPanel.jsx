import React, { useState, useEffect, useRef } from "react";
import { X, MessageSquare, Send, Lock, Pin, Reply, Smile } from "lucide-react";
import { Button } from "../../ui/Button";
import LinkifiedText from "../../common/LinkifiedText";
import { groupApi } from "../../../api/client";

export function GroupChatPanel({
  group,
  user,
  isHost,
  hasAccessToPrivate,
  messages,
  setMessages,
  loadingMessages,
  onError,
}) {
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeEmojiPicker, setActiveEmojiPicker] = useState(null);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-emerald-400", "rounded-2xl");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-emerald-400", "rounded-2xl");
      }, 2000);
    }
  };

  const handleToggleReaction = async (messageId, emoji) => {
    if (!group?.id) return;
    try {
      const res = await groupApi.toggleReaction(group.id, messageId, emoji);
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, reactions: res.data } : m,
          ),
        );
      }
    } catch {
      // Silent reaction failover
    } finally {
      setActiveEmojiPicker(null);
    }
  };

  const handleTogglePin = async (messageId) => {
    if (!group?.id || !isHost) return;
    try {
      const res = await groupApi.togglePinMessage(group.id, messageId);
      if (res.success) {
        const isNowPinned = res.data.is_pinned;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === messageId) {
              return { ...m, is_pinned: isNowPinned };
            }
            return isNowPinned ? { ...m, is_pinned: false } : m;
          }),
        );
      }
    } catch (err) {
      onError(err.message || "Gagal mengubah status sematan pesan");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || sendingMessage) return;

    setSendingMessage(true);
    try {
      const res = await groupApi.sendMessage(
        group.id,
        text,
        replyingTo?.id || null,
      );
      if (res.success) {
        setMessages((prev) => [...prev, res.data]);
        setNewMessage("");
        setReplyingTo(null);
      } else {
        throw new Error(res.message || "Gagal mengirim pesan");
      }
    } catch (err) {
      onError(err.message || "Gagal mengirim pesan diskusi");
    } finally {
      setSendingMessage(false);
    }
  };

  const pinnedMsg = messages.find((m) => m.is_pinned);

  return (
    <div className="flex flex-col h-[min(480px,50dvh)] min-h-[300px]">
      {!hasAccessToPrivate ? (
        <div className="m-auto text-center p-6 rounded-2xl bg-slate-50 border border-slate-200 max-w-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Ruang Diskusi Tertutup
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Ruang diskusi ini khusus untuk tutor dan peserta yang telah
            dikonfirmasi bergabung. Silakan ajukan permintaan bergabung terlebih
            dahulu.
          </p>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Pinned Announcement Banner */}
          {pinnedMsg && (
            <div className="mb-2 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 flex items-start justify-between gap-2 text-xs shadow-2xs">
              <div className="flex items-start gap-2 min-w-0">
                <Pin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-900 font-semibold mb-0.5">
                    <span>Pesan Disematkan Tutor</span>
                    <span>•</span>
                    <span className="font-normal text-amber-800">
                      {pinnedMsg.sender?.full_name || "Tutor"}
                    </span>
                  </div>
                  <p className="text-slate-800 text-[11px] line-clamp-2 leading-relaxed">
                    <LinkifiedText text={pinnedMsg.message} />
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 self-center">
                <button
                  type="button"
                  onClick={() => scrollToMessage(pinnedMsg.id)}
                  className="text-[10px] text-amber-800 hover:text-amber-950 font-semibold px-2 py-0.5 rounded hover:bg-amber-100 transition-colors"
                >
                  Lihat
                </button>
                {isHost && (
                  <button
                    type="button"
                    onClick={() => handleTogglePin(pinnedMsg.id)}
                    className="text-[10px] text-slate-500 hover:text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-50 transition-colors"
                    title="Lepas Sematan"
                  >
                    Lepas
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loadingMessages ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Memuat riwayat percakapan...
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center space-y-2 text-slate-500">
                <MessageSquare className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                <p className="text-xs font-medium text-slate-700">
                  Belum ada pesan di ruang diskusi sesi ini.
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Gunakan ruang ini untuk koordinasi materi, titik kumpul, atau
                  tanya jawab sebelum sesi dimulai.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const senderId = msg.sender_id || msg.user_id;
                const senderObj = msg.sender || msg.user;
                const isMe = senderId === user?.id;
                const isMsgHost = senderId === group.host_id;
                const msgTime = new Date(msg.created_at).toLocaleTimeString(
                  "id-ID",
                  { hour: "2-digit", minute: "2-digit" },
                );

                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className={`flex flex-col transition-all duration-300 p-1 rounded-2xl ${
                      isMe ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1 px-1">
                      <span className="font-semibold text-slate-700">
                        {isMe ? "Anda" : senderObj?.full_name || "Peserta"}
                      </span>
                      {senderObj?.campus_name && (
                        <span className="text-slate-400 text-[9px]">
                          ({senderObj.campus_name})
                        </span>
                      )}
                      {isMsgHost && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                          Tutor
                        </span>
                      )}
                      <span>• {msgTime}</span>

                      {/* Action controls */}
                      <div className="inline-flex items-center gap-1 ml-1 opacity-70 hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setReplyingTo(msg)}
                          className="p-0.5 text-slate-400 hover:text-emerald-700 rounded transition-colors"
                          title="Balas pesan"
                          aria-label="Balas pesan"
                        >
                          <Reply className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveEmojiPicker(
                              activeEmojiPicker === msg.id ? null : msg.id,
                            )
                          }
                          className="p-0.5 text-slate-400 hover:text-amber-600 rounded transition-colors"
                          title="Beri reaksi"
                          aria-label="Beri reaksi"
                        >
                          <Smile className="w-3 h-3" />
                        </button>
                        {isHost && (
                          <button
                            type="button"
                            onClick={() => handleTogglePin(msg.id)}
                            className={`p-0.5 rounded transition-colors ${
                              msg.is_pinned
                                ? "text-amber-600"
                                : "text-slate-400 hover:text-amber-600"
                            }`}
                            title={
                              msg.is_pinned
                                ? "Lepas sematan"
                                : "Sematkan pesan penting"
                            }
                            aria-label="Sematkan pesan"
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Emoji Reaction Selector */}
                    {activeEmojiPicker === msg.id && (
                      <div className="flex items-center gap-1.5 p-1 mb-1 bg-white border border-slate-200 rounded-full shadow-sm text-xs z-10 animate-in fade-in">
                        {["👍", "❤️", "💡", "🔥", "🙌"].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className="hover:scale-125 px-1 py-0.5 rounded-full transition-transform"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? "bg-emerald-700 text-white rounded-br-xs shadow-2xs"
                          : "bg-white text-slate-800 rounded-bl-xs border border-slate-200 shadow-2xs"
                      }`}
                    >
                      {/* Quoted Reply Block */}
                      {msg.reply_to && (
                        <div
                          onClick={() => scrollToMessage(msg.reply_to.id)}
                          className={`mb-2 p-1.5 rounded-lg border-l-2 text-[10px] cursor-pointer transition-opacity hover:opacity-85 ${
                            isMe
                              ? "bg-emerald-800/80 border-emerald-300 text-emerald-50"
                              : "bg-slate-100 border-emerald-600 text-slate-700"
                          }`}
                        >
                          <div className="font-semibold truncate">
                            {msg.reply_to.sender?.full_name || "Peserta"}
                          </div>
                          <p className="truncate opacity-90">
                            {msg.reply_to.message}
                          </p>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap break-words">
                        <LinkifiedText text={msg.message} />
                      </p>
                    </div>

                    {/* Reactions Pill Display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div
                        className={`flex flex-wrap gap-1 mt-1 px-1 ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
                      >
                        {msg.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            type="button"
                            onClick={() =>
                              handleToggleReaction(msg.id, r.emoji)
                            }
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                              r.reacted
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-2xs"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span>{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Active Replying Banner */}
          {replyingTo && (
            <div className="px-3 py-1.5 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700">
              <div className="flex items-center gap-2 truncate">
                <Reply className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">
                  Membalas{" "}
                  <strong className="text-slate-900">
                    {replyingTo.sender?.full_name || "Peserta"}
                  </strong>
                  : &quot;{replyingTo.message.slice(0, 45)}
                  {replyingTo.message.length > 45 ? "…" : ""}&quot;
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full shrink-0"
                aria-label="Batal membalas"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Send box */}
          <form
            onSubmit={handleSendMessage}
            className="pt-3 border-t border-slate-200 flex items-center gap-2 bg-white"
          >
            <input
              type="text"
              placeholder="Tulis pesan untuk koordinasi sesi..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-700"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={sendingMessage}
              disabled={!newMessage.trim()}
            >
              <Send className="w-3.5 h-3.5" />
              Kirim
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
