// All data goes through the Express API. The browser uses NEXT_PUBLIC_API_URL; server renders inside
// docker may use API_INTERNAL_URL to reach the api container directly (unset on Vercel).
const baseUrl = () => (typeof window === 'undefined' && process.env.API_INTERNAL_URL) || process.env.NEXT_PUBLIC_API_URL;

export type OrderStatus = 'PENDING' | 'PAID';
export type Book = { id: string; title: string; description: string; priceTHB: number; coverUrl: string };
export type Order = {
  id: string;
  orderNumber: string;
  bookId: string;
  buyerName: string;
  buyerEmail: string;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  book: Book;
  download?: { expiresAt: string } | null;
};
export type TrackedOrder = Pick<Order, 'orderNumber' | 'status' | 'createdAt' | 'paidAt' | 'book'> & {
  download: { url: string; expiresAt: string } | null;
};

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`API responded ${status}`);
  }
}

async function api<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(`${baseUrl()}/api${path}`, {
    cache: 'no-store',
    ...(body && { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  if (!res.ok) throw new ApiError(res.status);
  return res.json();
}

export const getBooks = () => api<Book[]>('/books');
export const getBook = (id: string) => api<Book>(`/books/${encodeURIComponent(id)}`);
export const createOrder = (body: { bookId: string; buyerName: string; buyerEmail: string }) => api<Order>('/orders', body);
export const mockPay = (id: string) => api<Order>(`/orders/${encodeURIComponent(id)}/mock-pay`, {});
export const lookupOrder = (body: { orderNumber: string; email: string }) => api<TrackedOrder>('/orders/lookup', body);
