import { storage } from "../storage";

export class PhotoRepository {
  savePhoto(data: Parameters<typeof storage.savePhoto>[0]) {
    return storage.savePhoto(data);
  }
  getPhoto(photoId: string) {
    return storage.getPhoto(photoId);
  }
  getPhotosByMeal(mealId: number) {
    return storage.getPhotosByMeal(mealId);
  }
  getPhotosByUser(userId: number) {
    return storage.getPhotosByUser(userId);
  }
  deletePhoto(photoId: string) {
    return storage.deletePhoto(photoId);
  }
  countUserPhotos(userId: number) {
    return storage.countUserPhotos(userId);
  }
}

export const photoRepository = new PhotoRepository();
