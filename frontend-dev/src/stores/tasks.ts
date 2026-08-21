import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tasksApi } from '@/api'
import { getData } from '@/mock'
import type { TaskItem, TaskType } from '@/types'

export const useTasksStore = defineStore('tasks', () => {
  const items = ref<TaskItem[]>(getData().tasks.map((t) => ({ ...t })))

  function sync() {
    items.value = getData().tasks.map((t) => ({ ...t }))
  }

  async function create(input: { title: string; agent: string; agentIcon: string; agentAccent: string; type: TaskType; schedule?: string }) {
    const t = await tasksApi.create(input)
    sync()
    return t
  }

  async function cancel(id: string) {
    await tasksApi.cancel(id)
    sync()
  }

  async function rerun(id: string) {
    await tasksApi.rerun(id)
    sync()
  }

  return { items, sync, create, cancel, rerun }
})