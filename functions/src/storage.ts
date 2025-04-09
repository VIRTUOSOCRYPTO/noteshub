// Basic placeholder for storage interface
export const storage = {
  // Add basic methods that might be needed
  getItem: async (id: string) => {
    return { id, name: "Placeholder" };
  },
  listItems: async () => {
    return [{ id: "1", name: "Placeholder" }];
  }
};