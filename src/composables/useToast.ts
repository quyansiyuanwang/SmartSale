import { toastController } from '@ionic/vue';

export async function showToast(message: string, color: 'success' | 'danger' | 'dark' = 'dark', duration = 2000) {
  const toast = await toastController.create({
    message,
    duration,
    position: 'bottom',
    color
  });
  await toast.present();
}
