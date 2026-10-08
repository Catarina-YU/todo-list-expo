import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  View,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { taskRepository } from '@/repositories/taskRepository';
import { categoryRepository } from '@/repositories/categoryRepository';
import { notificationService } from '@/services/notificationService';
import { Category } from '@/types/category';
import { Task } from '@/types/task';
import { useTheme } from '@/hooks/use-theme';

function parseIsoToInputs(isoString?: string | null): { dateStr: string; timeStr: string } {
  if (!isoString) return { dateStr: '', timeStr: '' };
  try {
    const parts = isoString.split('T');
    if (parts.length !== 2) return { dateStr: '', timeStr: '' };
    const [datePart, timePartFull] = parts;
    const [year, month, day] = datePart.split('-');
    if (!year || !month || !day) return { dateStr: '', timeStr: '' };
    const dateStr = `${day}/${month}/${year}`;
    const timePart = timePartFull.substring(0, 5);
    return { dateStr, timeStr: timePart };
  } catch {
    return { dateStr: '', timeStr: '' };
  }
}

function validateAndFormatDateTime(dateStr: string, timeStr: string): { iso: string | null; error?: string } {
  const trimmedDate = dateStr.trim();
  const trimmedTime = timeStr.trim();

  if (!trimmedDate && !trimmedTime) {
    return { iso: null };
  }

  if ((trimmedDate && !trimmedTime) || (!trimmedDate && trimmedTime)) {
    return {
      iso: null,
      error: 'Por favor, preencha tanto a data quanto o horário de vencimento, ou deixe ambos em branco.',
    };
  }

  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const dateMatch = trimmedDate.match(dateRegex);
  if (!dateMatch) {
    return { iso: null, error: 'Formato de data inválido. Use DD/MM/AAAA.' };
  }

  const [, dayStr, monthStr, yearStr] = dateMatch;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return { iso: null, error: 'A data informada não existe no calendário.' };
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const timeMatch = trimmedTime.match(timeRegex);
  if (!timeMatch) {
    return { iso: null, error: 'Formato de horário inválido. Use HH:MM (00:00 a 23:59).' };
  }

  const iso = `${yearStr}-${monthStr}-${dayStr}T${trimmedTime}:00`;
  return { iso };
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const isNew = id === 'new';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [completed, setCompleted] = useState(false);
  const [dueDateInput, setDueDateInput] = useState('');
  const [dueTimeInput, setDueTimeInput] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const categoriesData = await categoryRepository.getAll();
      setCategories(categoriesData);

      if (!isNew && id) {
        const task = await taskRepository.getById(id);
        if (task) {
          setTitle(task.title);
          setDescription(task.description ?? '');
          setCompleted(task.completed);
          const { dateStr, timeStr } = parseIsoToInputs(task.dueDateTime);
          setDueDateInput(dateStr);
          setDueTimeInput(timeStr);
          setCategoryId(task.categoryId ?? null);
        } else {
          Alert.alert('Erro', 'Tarefa não encontrada.');
          router.back();
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados da tarefa:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  }, [id, isNew, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Campo Obrigatório', 'Por favor, informe o título da tarefa.');
      return;
    }

    const { iso, error } = validateAndFormatDateTime(dueDateInput, dueTimeInput);
    if (error) {
      Alert.alert('Data/Hora Inválida', error);
      return;
    }

    try {
      setSaving(true);
      let savedTask: Task | null = null;

      if (isNew) {
        savedTask = await taskRepository.create({
          title: trimmedTitle,
          description: description.trim() || null,
          completed,
          dueDateTime: iso,
          categoryId: categoryId || null,
        });
      } else if (id) {
        savedTask = await taskRepository.update(id, {
          title: trimmedTitle,
          description: description.trim() || null,
          completed,
          dueDateTime: iso,
          categoryId: categoryId || null,
        });
      }

      if (savedTask) {
        const notifSuccess = await notificationService.syncTaskNotification(savedTask);
        if (!notifSuccess && !completed && iso) {
          const dueDate = new Date(iso);
          if (dueDate > new Date()) {
            Alert.alert(
              'Aviso',
              'Tarefa salva com sucesso, mas a notificação não pôde ser agendada (permissão negada).'
            );
          }
        }
      }

      router.back();
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      Alert.alert('Erro', 'Não foi possível salvar a tarefa. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (isNew || !id) return;

    Alert.alert(
      'Excluir Tarefa',
      'Tem certeza de que deseja excluir esta tarefa permanentemente do banco de dados?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await notificationService.cancelTaskNotification(id);
              await taskRepository.delete(id);
              router.back();
            } catch (error) {
              console.error('Erro ao excluir tarefa:', error);
              Alert.alert('Erro', 'Não foi possível excluir a tarefa.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3c87f7" />
          <ThemedText type="small" style={{ marginTop: Spacing.two }}>
            Carregando detalhes...
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle">
            {isNew ? 'Nova Tarefa' : 'Editar Tarefa'}
          </ThemedText>
          <Pressable style={styles.backHeaderButton} onPress={() => router.back()}>
            <ThemedText type="linkPrimary">Cancelar</ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView type="backgroundElement" style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <ThemedText type="smallBold">Título *</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: '#ccc' }]}
                placeholder="Ex: Estudar para prova de Mobile"
                placeholderTextColor="#888"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText type="smallBold">Descrição</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { color: theme.text, borderColor: '#ccc' },
                ]}
                placeholder="Detalhes adicionais sobre a tarefa..."
                placeholderTextColor="#888"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText type="smallBold">Categoria</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow}>
                <Pressable
                  style={[
                    styles.categoryChip,
                    categoryId === null && styles.categoryChipSelected,
                  ]}
                  onPress={() => setCategoryId(null)}>
                  <ThemedText
                    style={[
                      styles.categoryChipText,
                      categoryId === null && styles.categoryChipTextSelected,
                    ]}>
                    Sem Categoria
                  </ThemedText>
                </Pressable>

                {categories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected,
                      ]}
                      onPress={() => setCategoryId(cat.id)}>
                      <ThemedText
                        style={[
                          styles.categoryChipText,
                          isSelected && styles.categoryChipTextSelected,
                        ]}>
                        {cat.name}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText type="smallBold">Data e Hora de Vencimento (Opcional)</ThemedText>
              <View style={styles.dateTimeRow}>
                <View style={styles.dateInputContainer}>
                  <ThemedText type="small" style={styles.subLabel}>Data (DD/MM/AAAA)</ThemedText>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: '#ccc' }]}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#888"
                    value={dueDateInput}
                    onChangeText={setDueDateInput}
                    maxLength={10}
                  />
                </View>

                <View style={styles.timeInputContainer}>
                  <ThemedText type="small" style={styles.subLabel}>Hora (HH:MM)</ThemedText>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: '#ccc' }]}
                    placeholder="HH:MM"
                    placeholderTextColor="#888"
                    value={dueTimeInput}
                    onChangeText={setDueTimeInput}
                    maxLength={5}
                  />
                </View>
              </View>
            </View>

            <View style={styles.switchRow}>
              <ThemedText type="smallBold">Tarefa Concluída</ThemedText>
              <Switch
                value={completed}
                onValueChange={setCompleted}
                trackColor={{ false: '#767577', true: '#3c87f7' }}
                thumbColor={completed ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.actionsContainer}>
              <Pressable
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={handleSave}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <ThemedText style={styles.saveButtonText}>
                    {isNew ? 'Criar Tarefa' : 'Salvar Alterações'}
                  </ThemedText>
                )}
              </Pressable>

              {!isNew && (
                <Pressable
                  style={[styles.deleteButton, saving && styles.disabledButton]}
                  onPress={handleDelete}
                  disabled={saving}>
                  <ThemedText style={styles.deleteButtonText}>Excluir Tarefa</ThemedText>
                </Pressable>
              )}
            </View>
          </ThemedView>
        </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  backHeaderButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  scrollContent: {
    paddingBottom: Spacing.five,
  },
  formCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.four,
  },
  fieldGroup: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dateInputContainer: {
    flex: 2,
    gap: Spacing.one,
  },
  timeInputContainer: {
    flex: 1.2,
    gap: Spacing.one,
  },
  subLabel: {
    opacity: 0.7,
  },
  categoriesRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.one,
  },
  categoryChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    borderWidth: 1,
    borderColor: '#3c87f7',
    marginRight: Spacing.two,
  },
  categoryChipSelected: {
    backgroundColor: '#3c87f7',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#3c87f7',
  },
  categoryChipTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  actionsContainer: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  saveButton: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ff3b301a',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  deleteButtonText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: '600',
  },
});
