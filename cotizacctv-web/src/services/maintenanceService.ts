import api from "@/lib/api";
import { MaintenanceReminder } from "@/types";

export const getMaintenanceReminders = async (params?: { upcoming?: boolean }): Promise<MaintenanceReminder[]> => {
  const response = await api.get("/maintenance-reminders", { params });
  return response.data;
};

export const markAsCalled = async (id: number): Promise<MaintenanceReminder> => {
  const response = await api.patch(`/maintenance-reminders/${id}/called`);
  return response.data;
};
