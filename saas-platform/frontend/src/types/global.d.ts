// Type definitions for development
declare module 'react' {
  interface ReactNode {}
  interface HTMLAttributes<T = any> {
    className?: string;
    children?: ReactNode;
    [key: string]: any;
  }
  interface ButtonHTMLAttributes<T = any> extends HTMLAttributes<T> {
    onClick?: (...args: any[]) => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }
  function createContext<T>(defaultValue: T): any;
  function useContext(context: any): any;
  function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  function useState<T>(initialState: T): [T, (value: T) => void];
  function useCallback<T extends (...args: any[]) => any>(
    callback: T,
    deps: any[]
  ): T;
  function forwardRef<T, P = {}>(
    render: (props: P, ref: any) => ReactNode
  ): (props: P & { ref?: any }) => ReactNode;
  const Fragment: any;
}

declare module 'socket.io-client' {
  interface Socket {
    on(event: string, callback: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
    close(): void;
    disconnect(): void;
    connected: boolean;
    off(event: string, callback?: (...args: any[]) => void): void;
  }

  function io(url: string, options?: any): Socket;
}

declare namespace JSX {
  interface IntrinsicElements {
    div: any;
    h1: any;
    h2: any;
    h3: any;
    h4: any;
    h5: any;
    h6: any;
    p: any;
    button: any;
    input: any;
    form: any;
    span: any;
    section: any;
    nav: any;
    header: any;
    footer: any;
    main: any;
    aside: any;
    ul: any;
    li: any;
    a: any;
    img: any;
    [elemName: string]: any;
  }
}

// Global window object
declare global {
  interface Window {
    localStorage: Storage;
  }

  interface Storage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  }

  const localStorage: Storage;
  const console: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };

  const process: {
    env: {
      NEXT_PUBLIC_WS_URL?: string;
      [key: string]: string | undefined;
    };
  };
}
