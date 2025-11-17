class ApiClient {
  private base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  private buildUrl(path: string) {
    if (path.startsWith("http")) return path;
    if (typeof window !== "undefined") {
      return path;
    }
    return `${this.base}${path}`;
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(this.buildUrl(path), { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`GET ${path} failed: ${res.status}`);
    }
    return (await res.json()) as T;
  }

  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(this.buildUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`POST ${path} failed: ${res.status} ${detail}`);
    }
    if (res.status === 204) {
      return {} as T;
    }
    return (await res.json()) as T;
  }

  async patch<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(this.buildUrl(path), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`PATCH ${path} failed: ${res.status} ${detail}`);
    }
    if (res.status === 204) {
      return {} as T;
    }
    return (await res.json()) as T;
  }
}

export const apiClient = new ApiClient();
