import React from 'react';
import Image from 'next/image';
import { Task } from "@/types/task";
import { FiEdit, FiTrash2, FiCheck, FiX } from "react-icons/fi";
import { useState } from "react";
import TaskFormFields from "./task-form-fields";
import { toast } from "@/lib/toast";

interface TaskTableProps {
    tasks: Task[];
    updateTask: (formData: FormData) => Promise<{ success: boolean; error?: string } | undefined>;
    deleteTask: (formData: FormData) => Promise<{ success: boolean; error?: string } | undefined>;
}

export default function TaskTable({ tasks, updateTask, deleteTask }: TaskTableProps) {
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData(event.currentTarget);
            formData.set('id', editingTask!.id.toString());
            const result = await updateTask(formData);
            if (result?.success) {
                toast.success(`Task updated — ${editingTask?.name || ''}`);
                setEditingTask(null);
            } else {
                toast.error(result?.error || 'Failed to update task');
            }
        } catch (err) {
            toast.error('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (task: Task) => {
        const formData = new FormData();
        formData.set('id', task.id.toString());
        deleteTask(formData);
    };

    return (
        <div className="bg-slate-900 rounded-lg border border-slate-700">
            <table className="w-full text-left divide-y divide-slate-700">
                <thead className="bg-slate-800">
                    <tr>
                        <th className="px-6 py-3 text-xs font-medium text-slate-300 uppercase tracking-wider">Task</th>
                        <th className="px-6 py-3 text-xs font-medium text-slate-300 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-xs font-medium text-slate-300 uppercase tracking-wider">Owner</th>
                        <th className="px-6 py-3 text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {tasks.map(task => (
                        <tr key={task.id}>
                            {editingTask?.id === task.id ? (
                                <td colSpan={4} className="p-4">
                                    <form onSubmit={handleUpdate} className="grid grid-cols-5 gap-4 items-center">
                                        <div className="col-span-4 grid grid-cols-3 gap-4">
                                            <TaskFormFields />
                                        </div>
                                        <div className="flex items-center justify-end space-x-2">
                                            <button 
                                                type="submit" 
                                                disabled={isSubmitting}
                                                className="p-2 text-green-500 hover:text-green-400 disabled:opacity-50"
                                            >
                                                {isSubmitting ? (
                                                    <div className="h-3.5 w-3.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    <FiCheck className="w-4 h-4" />
                                                )}
                                            </button>
                                            <button type="button" onClick={() => setEditingTask(null)} className="p-2 text-red-500 hover:text-red-400">
                                                <FiX />
                                            </button>
                                        </div>
                                    </form>
                                </td>
                            ) : (
                                <>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{task.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{task.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                        {task.owner ? (
                                            <div className="flex items-center gap-2">
                                                {task.owner.avatarUrl ? (
                                                    <Image src={task.owner.avatarUrl} alt={task.owner.fullName || ''} width={20} height={20} className="w-5 h-5 rounded-full" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[11px] text-white">
                                                        {(task.owner.fullName || task.owner.email || '?')[0].toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="text-xs">{task.owner.fullName || task.owner.email}</span>
                                            </div>
                                        ) : <span className="text-xs text-slate-500">-</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap ${task.status === 'DONE' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                                            {task.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-4">
                                            <button onClick={() => setEditingTask(task)} className="p-2 text-slate-400 hover:text-white">
                                                <FiEdit />
                                            </button>
                                            <button onClick={() => handleDelete(task)} className="p-2 text-slate-400 hover:text-red-500">
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </td>
                                </>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
