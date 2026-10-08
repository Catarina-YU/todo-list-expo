import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Pressable,
  FlatList,
  View,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { taskRepository } from '@/repositories/taskRepository';
import { categoryRepository } from '@/repositories/categoryRepository';
import { notificationService } from '@/services/notificationService';
import { Task } from '@/types/task';
import { Category } from '@/types/category';

type StatusFilter = 'all' | 'pending' | 'completed';

export default function TasksListScreen() {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksData, categoriesData] = await Promise.all([
        taskRepository.getAll(),
        categoryRepository.getAll(),
      ]);
      setTasks(tasksData);
      setCategories(categoriesData);

      // Sincronizar notificações ao reabrir/focar no app
      await notificationService.syncAllTaskNotifications(tasksData);
    } catch (error) {
      console.error('Erro ao carregar tarefas do banco:', error);
      Alert.alert('Erro', 'Não foi possível carregar as tarefas salvas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleToggleCompleted = async (task: Task) => {
    try {
      const updatedStatus = !task.completed;
      const updatedTask = await taskRepository.update(task.id, { completed: updatedStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: updatedStatus } : t))
      );

      if (updatedTask) {
        await notificationService.syncTaskNotification(updatedTask);
      }
    } catch (error) {
      console.error('Erro ao alterar status da tarefa:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status da tarefa.');
      await loadData();
    }
  };

  const getCategoryName = (categoryId?: string | null) => {
    if (!categoryId) return null;
    const found = categories.find((c) => c.id === categoryId);
    return found ? found.name : null;
  };

  const formatDisplayDate = (isoString?: string | null): string => {
    if (!isoString) return '';
    try {
      const parts = isoString.split('T');
      if (parts.length !== 2) return isoString;
      const [datePart, timePartFull] = parts;
      const [year, month, day] = datePart.split('-');
      if (!year || !month || !day) return isoString;
      const timePart = timePartFull.substring(0, 5);
      return `${day}/${month}/${year} ${timePart}`;
    } catch {
      return isoString;
    }
  };

  // In-memory filtering
  const filteredTasks = tasks.filter((task) => {
    // Status filter
    if (statusFilter === 'pending' && task.completed) return false;
    if (statusFilter === 'completed' && !task.completed) return false;

    // Category filter
    if (selectedCategoryId !== null) {
      if (task.categoryId !== selectedCategoryId) return false;
    }

    return true;
  });

  const renderTaskItem = ({ item }: { item: Task }) => {
    const categoryName = getCategoryName(item.categoryId);

    return (
      <Pressable onPress={() => router.push(`/task/${item.id}`)}>
        <ThemedView type="backgroundElement" style={styles.taskCard}>
          <Pressable
            style={styles.checkboxContainer}
            onPress={() => handleToggleCompleted(item)}
            hitSlop={8}>
            <View
              style={[
                styles.checkbox,
                item.completed && styles.checkboxCompleted,
              ]}>
              {item.completed && <ThemedText style={styles.checkmark}>✓</ThemedText>}
            </View>
          </Pressable>

          <View style={styles.taskDetails}>
            <ThemedText
              type="default"
              style={[
                styles.taskTitle,
                item.completed && styles.completedText,
              ]}>
              {item.title}
            </ThemedText>

            {!!item.description && (
              <ThemedText
                type="small"
                numberOfLines={2}
                style={[
                  styles.taskDescription,
                  item.completed && styles.completedText,
                ]}>
                {item.description}
              </ThemedText>
            )}

            <View style={styles.badgeRow}>
              {!!categoryName && (
                <View style={styles.categoryBadge}>
                  <ThemedText style={styles.badgeText}>{categoryName}</ThemedText>
                </View>
              )}

              {!!item.dueDateTime && (
                <View style={styles.dueDateBadge}>
                  <ThemedText style={styles.badgeText}>📅 {formatDisplayDate(item.dueDateTime)}</ThemedText>
                </View>
              )}
            </View>
          </View>
        </ThemedView>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header Layout Adjustment */}
        <View style={styles.header}>
          <ThemedText type="subtitle">Minhas Tarefas</ThemedText>
        </View>

        <View style={styles.actionsBar}>
          <Pressable
            style={styles.actionButtonPrimary}
            onPress={() => router.push('/task/new')}>
            <ThemedText style={styles.actionButtonPrimaryText}>+ Nova Tarefa</ThemedText>
          </Pressable>

          <Pressable
            style={styles.actionButtonSecondary}
            onPress={() => router.push('/categories')}>
            <ThemedText style={styles.actionButtonSecondaryText}>Gerenciar Categorias</ThemedText>
          </Pressable>
        </View>

        {/* Filters Section */}
        <View style={styles.filtersSection}>
          {/* Status Filters */}
          <View style={styles.statusFilterRow}>
            <Pressable
              style={[
                styles.statusChip,
                statusFilter === 'all' && styles.statusChipActive,
              ]}
              onPress={() => setStatusFilter('all')}>
              <ThemedText
                style={[
                  styles.statusChipText,
                  statusFilter === 'all' && styles.statusChipTextActive,
                ]}>
                Todas
              </ThemedText>
            </Pressable>

            <Pressable
              style={[
                styles.statusChip,
                statusFilter === 'pending' && styles.statusChipActive,
              ]}
              onPress={() => setStatusFilter('pending')}>
              <ThemedText
                style={[
                  styles.statusChipText,
                  statusFilter === 'pending' && styles.statusChipTextActive,
                ]}>
                Pendentes
              </ThemedText>
            </Pressable>

            <Pressable
              style={[
                styles.statusChip,
                statusFilter === 'completed' && styles.statusChipActive,
              ]}
              onPress={() => setStatusFilter('completed')}>
              <ThemedText
                style={[
                  styles.statusChipText,
                  statusFilter === 'completed' && styles.statusChipTextActive,
                ]}>
                Concluídas
              </ThemedText>
            </Pressable>
          </View>

          {/* Category Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterRow}>
            <Pressable
              style={[
                styles.categoryChip,
                selectedCategoryId === null && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategoryId(null)}>
              <ThemedText
                style={[
                  styles.categoryChipText,
                  selectedCategoryId === null && styles.categoryChipTextActive,
                ]}>
                Todas as categorias
              </ThemedText>
            </Pressable>

            {categories.map((cat) => {
              const isActive = selectedCategoryId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    isActive && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategoryId(cat.id)}>
                  <ThemedText
                    style={[
                      styles.categoryChipText,
                      isActive && styles.categoryChipTextActive,
                    ]}>
                    {cat.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3c87f7" />
            <ThemedText type="small" style={{ marginTop: Spacing.two }}>
              Carregando tarefas...
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.id}
            renderItem={renderTaskItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <ThemedView type="backgroundElement" style={styles.emptyCard}>
                <ThemedText type="default" style={styles.emptyTitle}>
                  {tasks.length === 0
                    ? 'Nenhuma tarefa cadastrada!'
                    : 'Nenhuma tarefa encontrada com esses filtros.'}
                </ThemedText>
                <ThemedText type="small" style={styles.emptySubtitle}>
                  {tasks.length === 0
                    ? 'Toque no botão "+ Nova Tarefa" acima para criar sua primeira tarefa.'
                    : 'Tente alterar os filtros de status ou categoria para ver mais resultados.'}
                </ThemedText>
              </ThemedView>
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  safeArea: {
    flex: 1,
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  header: {
    marginBottom: Spacing.one,
  },
  actionsBar: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  actionButtonPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3c87f7',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  actionButtonSecondaryText: {
    color: '#3c87f7',
    fontSize: 14,
    fontWeight: '500',
  },
  filtersSection: {
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  statusFilterRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statusChip: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#cccccc',
    alignItems: 'center',
  },
  statusChipActive: {
    backgroundColor: '#3c87f7',
    borderColor: '#3c87f7',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  categoryFilterRow: {
    paddingVertical: Spacing.one,
    gap: Spacing.two,
  },
  categoryChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
    borderWidth: 1,
    borderColor: '#3c87f7',
    marginRight: Spacing.two,
  },
  categoryChipActive: {
    backgroundColor: '#3c87f7',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#3c87f7',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContainer: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  taskCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  checkboxContainer: {
    paddingTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3c87f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#3c87f7',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  taskDetails: {
    flex: 1,
    gap: Spacing.one,
  },
  taskTitle: {
    fontWeight: '600',
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  taskDescription: {
    opacity: 0.7,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  categoryBadge: {
    backgroundColor: '#3c87f71a',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
  },
  dueDateBadge: {
    backgroundColor: '#ff95001a',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
  },
  badgeText: {
    fontSize: 12,
    color: '#3c87f7',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: Spacing.five,
    borderRadius: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyTitle: {
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
