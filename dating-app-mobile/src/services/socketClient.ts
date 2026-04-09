import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'https://dating-app-xgvv.onrender.com';

class SocketClient {
  private socket: Socket | null = null;

  async connect(): Promise<Socket> {
    if (this.socket?.connected) return this.socket;

    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('No auth token available');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket connection timed out')), 10000);

      this.socket!.on('connect', () => {
        clearTimeout(timeout);
        resolve(this.socket!);
      });

      this.socket!.on('connect_error', (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(matchId: string) {
    this.socket?.emit('join_room', { matchId });
  }

  sendMessage(matchId: string, content: string) {
    this.socket?.emit('send_message', { matchId, content });
  }

  sendTyping(matchId: string, isTyping: boolean) {
    this.socket?.emit('typing', { matchId, isTyping });
  }

  markRead(matchId: string) {
    this.socket?.emit('mark_read', { matchId });
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.socket?.on(event, handler);
  }

  off(event: string, handler?: (...args: any[]) => void) {
    if (handler) {
      this.socket?.off(event, handler);
    } else {
      this.socket?.removeAllListeners(event);
    }
  }
}

export const socketClient = new SocketClient();
