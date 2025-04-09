/**
 * WebSocket Client API
 * 
 * Establishes and manages WebSocket connections to the server for real-time communication.
 * Used primarily for collaborative drawing features.
 */

import { API_BASE_URL } from './api';

type DrawingData = {
  x: number;
  y: number;
  prevX?: number;
  prevY?: number;
  color: string;
  width: number;
  tool: 'pen' | 'eraser' | 'line' | 'rect' | 'circle';
  isDragging?: boolean;
};

type MessageHandler = (message: any) => void;

// Event handlers for different WebSocket events
interface WebSocketHandlers {
  onJoined?: (drawingId: string, clients: number) => void;
  onDraw?: (drawData: DrawingData) => void;
  onClientJoined?: (clients: number) => void;
  onClientLeft?: (clients: number) => void;
  onError?: (error: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

// Connection status for the WebSocket
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

export class DrawingWebSocket {
  private socket: WebSocket | null = null;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private drawingId: string | null = null;
  private handlers: WebSocketHandlers = {};
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000; // Start with 2 seconds
  
  /**
   * Initialize a WebSocket connection for a specific drawing
   * 
   * @param drawingId - ID of the drawing to join
   * @param handlers - Event handlers for WebSocket events
   * @returns The DrawingWebSocket instance
   */
  connect(drawingId: string, handlers: WebSocketHandlers = {}): DrawingWebSocket {
    this.drawingId = drawingId;
    this.handlers = handlers;
    
    // Get the appropriate WebSocket URL based on the current environment
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let host: string;
    
    // For absolute URLs (including localtunnel), extract the host
    if (API_BASE_URL.startsWith('http')) {
      const url = new URL(API_BASE_URL);
      host = url.host;
    } else if (API_BASE_URL === '') {
      // For empty API_BASE_URL (development proxy setup)
      host = window.location.host;
    } else {
      // For relative API_BASE_URL
      host = window.location.host;
    }
    
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    this.status = ConnectionStatus.CONNECTING;
    
    try {
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        this.status = ConnectionStatus.CONNECTED;
        this.reconnectAttempts = 0;
        console.log(`WebSocket connected to ${wsUrl}`);
        
        // Join the drawing room immediately after connection
        this.joinDrawing(drawingId);
        
        if (this.handlers.onConnect) {
          this.handlers.onConnect();
        }
      };
      
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          if (this.handlers.onError) {
            this.handlers.onError(error);
          }
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.status = ConnectionStatus.ERROR;
        if (this.handlers.onError) {
          this.handlers.onError(error);
        }
      };
      
      this.socket.onclose = () => {
        console.log('WebSocket connection closed');
        this.status = ConnectionStatus.DISCONNECTED;
        if (this.handlers.onDisconnect) {
          this.handlers.onDisconnect();
        }
        
        // Attempt to reconnect if not manually disconnected
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.status = ConnectionStatus.ERROR;
      if (this.handlers.onError) {
        this.handlers.onError(error);
      }
    }
    
    return this;
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: any) {
    switch (message.type) {
      case 'joined':
        if (this.handlers.onJoined) {
          this.handlers.onJoined(message.drawingId, message.clients);
        }
        break;
        
      case 'draw':
        if (this.handlers.onDraw) {
          this.handlers.onDraw(message.drawData);
        }
        break;
        
      case 'clientJoined':
        if (this.handlers.onClientJoined) {
          this.handlers.onClientJoined(message.clients);
        }
        break;
        
      case 'clientLeft':
        if (this.handlers.onClientLeft) {
          this.handlers.onClientLeft(message.clients);
        }
        break;
        
      default:
        console.log('Received unknown message type:', message);
    }
  }
  
  /**
   * Join a specific drawing room
   */
  private joinDrawing(drawingId: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'join',
        drawingId
      }));
    }
  }
  
  /**
   * Send drawing data to the server
   */
  sendDrawingData(drawData: DrawingData) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'draw',
        drawData
      }));
    }
  }
  
  /**
   * Attempt to reconnect to the WebSocket server
   */
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.drawingId) {
      this.reconnectAttempts++;
      
      // Exponential backoff
      const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1));
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (this.status !== ConnectionStatus.CONNECTED && this.drawingId) {
          console.log(`Reconnecting to WebSocket (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          this.connect(this.drawingId, this.handlers);
        }
      }, delay);
    }
  }
  
  /**
   * Manually disconnect from the WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.status = ConnectionStatus.DISCONNECTED;
    }
  }
  
  /**
   * Get the current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }
  
  /**
   * Check if the WebSocket is currently connected
   */
  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }
}

// Singleton instance for app-wide use
export const drawingSocket = new DrawingWebSocket();