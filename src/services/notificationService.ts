import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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

let channelInitialized = false;

export const notificationService = {
  async ensureAndroidChannelAsync(): Promise<void> {
    if (Platform.OS === 'android' && !channelInitialized) {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Lembretes de Tarefas',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3C87F7',
        });
        channelInitialized = true;
        console.log('[Notificação] Canal Android "default" verificado e configurado.');
      } catch (error) {
        console.error('[Notificação] Erro ao configurar canal de notificação no Android:', error);
      }
    }
  },

  async getPermissionsAsync(): Promise<boolean> {
    try {
      await this.ensureAndroidChannelAsync();
      const settings = await Notifications.getPermissionsAsync();
      return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
    } catch (error) {
      console.error('[Notificação] Erro ao verificar permissões de notificação:', error);
      return false;
    }
  },

  async requestPermissionsAsync(): Promise<boolean> {
    try {
      await this.ensureAndroidChannelAsync();
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      return status === 'granted';
    } catch (error) {
      console.error('[Notificação] Erro ao solicitar permissões de notificação:', error);
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
          console.log(`[Notificação] Notificação anterior (${notification.identifier}) cancelada para a tarefa ${taskId}`);
        }
      }
    } catch (error) {
      console.error(`[Notificação] Erro ao cancelar notificação para a tarefa ${taskId}:`, error);
    }
  },

  async scheduleTaskNotification(taskId: string, title: string, date: Date): Promise<string | null> {
    try {
      await this.ensureAndroidChannelAsync();

      // Cancelar qualquer notificação anterior para esta mesma tarefa antes de criar a nova
      await this.cancelTaskNotification(taskId);

      const now = new Date();
      if (date <= now) {
        console.log(`[Notificação] Data de vencimento no passado para a tarefa ${taskId} (${date.toISOString()} <= ${now.toISOString()}). Agendamento ignorado.`);
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

      console.log(`[Notificação] Agendada com sucesso para a tarefa ${taskId} ("${title}") na data ${date.toLocaleString()} - Identifier: ${identifier}`);
      return identifier;
    } catch (error) {
      console.error(`[Notificação] Erro ao agendar notificação para a tarefa ${taskId}:`, error);
      return null;
    }
  },

  async syncTaskNotification(task: Task): Promise<boolean> {
    try {
      await this.ensureAndroidChannelAsync();

      // Se a tarefa estiver concluída ou não tiver dueDateTime, cancela a notificação
      if (task.completed || !task.dueDateTime) {
        await this.cancelTaskNotification(task.id);
        return true;
      }

      // Converter dueDateTime (ex: "2026-10-15T14:30:00") para objeto Date local
      const dueDate = new Date(task.dueDateTime);
      if (isNaN(dueDate.getTime())) {
        await this.cancelTaskNotification(task.id);
        console.warn(`[Notificação] Data de vencimento inválida para a tarefa ${task.id}: ${task.dueDateTime}`);
        return false;
      }

      const now = new Date();
      if (dueDate <= now) {
        // Se a data já passou, remove agendamentos pendentes
        await this.cancelTaskNotification(task.id);
        console.log(`[Notificação] Data de vencimento no passado para a tarefa ${task.id} (${task.dueDateTime} <= ${now.toISOString()}). Agendamento cancelado.`);
        return false;
      }

      // Verificar/solicitar permissão antes de agendar
      let hasPermission = await this.getPermissionsAsync();
      if (!hasPermission) {
        hasPermission = await this.requestPermissionsAsync();
      }

      if (!hasPermission) {
        console.warn(`[Notificação] Permissão de notificação negada pelo usuário para a tarefa ${task.id}`);
        return false;
      }

      // Agendar notificação atualizada (scheduleTaskNotification substitui agendamentos anteriores da mesma tarefa)
      const identifier = await this.scheduleTaskNotification(task.id, task.title, dueDate);
      return identifier !== null;
    } catch (error) {
      console.error(`[Notificação] Erro ao sincronizar notificação da tarefa ${task.id}:`, error);
      return false;
    }
  },

  async syncAllTaskNotifications(tasks: Task[]): Promise<void> {
    try {
      await this.ensureAndroidChannelAsync();
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
      console.error('[Notificação] Erro ao sincronizar todas as notificações:', error);
    }
  },
};
