import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { categoryRepository } from '@/repositories/categoryRepository';
import { Category } from '@/types/category';
import { useTheme } from '@/hooks/use-theme';

export default function CategoriesScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await categoryRepository.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de categorias.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreateCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      Alert.alert('Campo Obrigatório', 'Por favor, informe um nome para a categoria.');
      return;
    }

    try {
      setIsSubmitting(true);
      await categoryRepository.create({ name: trimmedName });
      setNewCategoryName('');
      await loadCategories();
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      Alert.alert('Erro', 'Não foi possível criar a categoria. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (category: Category) => {
    setEditingCategory(category);
    setEditingName(category.name);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditingName('');
  };

  const handleSaveEdit = async () => {
    if (!editingCategory) return;

    const trimmedName = editingName.trim();
    if (!trimmedName) {
      Alert.alert('Campo Obrigatório', 'O nome da categoria não pode ficar em branco.');
      return;
    }

    try {
      setIsSubmitting(true);
      await categoryRepository.update(editingCategory.id, { name: trimmedName });
      setEditingCategory(null);
      setEditingName('');
      await loadCategories();
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a categoria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      'Excluir Categoria',
      `Tem certeza que deseja excluir "${category.name}"? As tarefas desta categoria permanecerão salvas, mas ficarão sem categoria vinculada.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await categoryRepository.delete(category.id);
              await loadCategories();
            } catch (error) {
              console.error('Erro ao excluir categoria:', error);
              Alert.alert('Erro', 'Não foi possível excluir a categoria.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const renderCategoryItem = ({ item }: { item: Category }) => {
    const isEditing = editingCategory?.id === item.id;

    if (isEditing) {
      return (
        <ThemedView type="backgroundElement" style={styles.itemCard}>
          <View style={styles.editForm}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: '#3c87f7' }]}
              value={editingName}
              onChangeText={setEditingName}
              placeholder="Nome da categoria"
              placeholderTextColor="#888"
              autoFocus
            />
            <View style={styles.actionButtons}>
              <Pressable
                style={[styles.smallButton, styles.saveButton]}
                onPress={handleSaveEdit}
                disabled={isSubmitting}>
                <ThemedText style={styles.buttonTextBold}>Salvar</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.smallButton, styles.cancelButton]}
                onPress={handleCancelEdit}
                disabled={isSubmitting}>
                <ThemedText style={styles.buttonText}>Cancelar</ThemedText>
              </Pressable>
            </View>
          </View>
        </ThemedView>
      );
    }

    return (
      <ThemedView type="backgroundElement" style={styles.itemCard}>
        <ThemedText type="default" style={styles.categoryName}>
          {item.name}
        </ThemedText>
        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.smallButton, styles.editButton]}
            onPress={() => handleStartEdit(item)}>
            <ThemedText style={styles.buttonText}>Editar</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.smallButton, styles.deleteButton]}
            onPress={() => handleDeleteCategory(item)}>
            <ThemedText style={styles.deleteButtonText}>Excluir</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Categorias</ThemedText>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ThemedText type="linkPrimary">Voltar para Tarefas</ThemedText>
          </Pressable>
        </View>

        <ThemedView type="backgroundElement" style={styles.formContainer}>
          <ThemedText type="smallBold">Nova Categoria</ThemedText>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: '#ccc' }]}
              placeholder="Digite o nome da categoria"
              placeholderTextColor="#888"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <Pressable
              style={[styles.addButton, isSubmitting && styles.disabledButton]}
              onPress={handleCreateCategory}
              disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.addButtonText}>Adicionar</ThemedText>
              )}
            </Pressable>
          </View>
        </ThemedView>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3c87f7" />
            <ThemedText type="small" style={{ marginTop: Spacing.two }}>
              Carregando categorias...
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            renderItem={renderCategoryItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <ThemedView type="backgroundElement" style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>
                  Nenhuma categoria cadastrada ainda. Adicione uma nova categoria acima!
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
    gap: Spacing.four,
    paddingTop: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  backButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  formContainer: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#3c87f7',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContainer: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  itemCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  categoryName: {
    flex: 1,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  smallButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
  },
  editButton: {
    backgroundColor: '#3c87f71a',
  },
  deleteButton: {
    backgroundColor: '#ff3b301a',
  },
  saveButton: {
    backgroundColor: '#3c87f7',
  },
  cancelButton: {
    backgroundColor: '#8888881a',
  },
  buttonText: {
    color: '#3c87f7',
    fontSize: 14,
  },
  buttonTextBold: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#ff3b30',
    fontSize: 14,
  },
  editForm: {
    flex: 1,
    gap: Spacing.two,
  },
  loadingContainer: {
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: Spacing.four,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
