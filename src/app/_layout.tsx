import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { TaskProvider } from '@/context/TaskContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <TaskProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Lista de Tarefas' }} />
          <Stack.Screen name="task/[id]" options={{ title: 'Detalhes / Edição' }} />
          <Stack.Screen name="categories" options={{ title: 'Categorias' }} />
        </Stack>
      </TaskProvider>
    </ThemeProvider>
  );
}
