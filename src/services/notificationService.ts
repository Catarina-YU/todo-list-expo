import * as Notifications from 'expo-notifications';
import { Task } from '@/types/task';

// Configurar comportamento das notificações quando o app estiver em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  async getPermissionsAsync(): Promise<boolean> {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
    } catch (error) {
      console.error('Erro ao verificar permissões de notificação:', error);
      return false;
    }
  },

  async requestPermissionsAsync(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      return status === 'granted';
    } catch (error) {
      console.error('Erro ao solicitar permissões de notificação:', error);
      return false;
    }
  },

  async cancelTaskNotification(taskId: string): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of scheduled) {
        const data = notification.content.data as { taskId?: string };
        if (data && data.taskId === taskId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
    } catch (error) {
      console.error(`Erro ao cancelar notificação para a tarefa ${taskId}:`, error);
    }
  },

  async scheduleTaskNotification(taskId: string, title: string, date: Date): Promise<string | null> {
    try {
      // Cancelar qualquer notificação anterior para esta tarefa para evitar duplicidade
      await this.cancelTaskNotification(taskId);

      const now = new Date();
      if (date <= now) {
        // Se a data já passou, não agendar
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Lembrete de tarefa',
          body: `"${title}" vence agora.`,
          data: { taskId },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: date,
        },
      });

      return identifier;
    } catch (error) {
      console.error(`Erro ao agendar notificação para a tarefa ${taskId}:`, error);
      return null;
    }
  },

  async syncTaskNotification(task: Task): Promise<boolean> {
    try {
      // Se a tarefa estiver concluída ou não tiver dueDateTime, cancela a notificação
      if (task.completed || !task.dueDateTime) {
        await this.cancelTaskNotification(task.id);
        return true;
      }

      // Converter dueDateTime (ex: "2026-10-15T14:30:00") para objeto Date local
      const dueDate = new Date(task.dueDateTime);
      if (isNaN(dueDate.getTime())) {
        await this.cancelTaskNotification(task.id);
        return false;
      }

      const now = new Date();
      if (dueDate <= now) {
        // Se a data já passou, remove agendamentos pendentes
        await this.cancelTaskNotification(task.id);
        return false;
      }

      // Verificar se já existe agendamento ativo para este taskId
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const existing = scheduled.find((n) => {
        const data = n.content.data as { taskId?: string };
        return data && data.taskId === task.id;
      });

      if (existing) {
        // Já possui notificação agendada
        return true;
      }

      // Verificar/solicitar permissão antes de agendar
      let hasPermission = await this.getPermissionsAsync();
      if (!hasPermission) {
        hasPermission = await this.requestPermissionsAsync();
      }

      if (!hasPermission) {
        return false;
      }

      await this.scheduleTaskNotification(task.id, task.title, dueDate);
      return true;
    } catch (error) {
      console.error(`Erro ao sincronizar notificação da tarefa ${task.id}:`, error);
      return false;
    }
  },

  async syncAllTaskNotifications(tasks: Task[]): Promise<void> {
    try {
      for (const task of tasks) {
        if (!task.completed && task.dueDateTime) {
          const dueDate = new Date(task.dueDateTime);
          if (!isNaN(dueDate.getTime()) && dueDate > new Date()) {
            await this.syncTaskNotification(task);
          } else {
            await this.cancelTaskNotification(task.id);
          }
        } else {
          await this.cancelTaskNotification(task.id);
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar todas as notificações:', error);
    }
  },
};
