import { toastController } from '@ionic/vue';

export async function showToast(message: string, color: 'success' | 'danger' | 'dark' = 'dark') {
  const toast = await toastController.create({
    message,
    duration: 2000,
    position: 'bottom',
    color
  });
  await toast.present();
}
