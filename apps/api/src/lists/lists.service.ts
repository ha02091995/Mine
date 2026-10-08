import { Injectable } from '@nestjs/common';
import { ApiException } from '../common/http';
import { MembershipService } from '../pair/membership.service';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
  ) {}

  async profile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { id: user.id, displayName: user.displayName, city: user.city };
  }

  async setCity(userId: string, city: string) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { city } });
    return { id: user.id, displayName: user.displayName, city: user.city };
  }

  async list(userId: string) {
    const member = await this.requirePair(userId);
    const lists = await this.prisma.sharedList.findMany({
      where: { partnershipId: member.partnershipId },
      orderBy: { createdAt: 'asc' },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    return lists.map((list) => ({
      id: list.id,
      title: list.title,
      items: list.items.map((item) => ({ id: item.id, body: item.body, done: item.done })),
    }));
  }

  async create(userId: string, title: string) {
    const member = await this.requirePair(userId);
    const list = await this.prisma.sharedList.create({
      data: { partnershipId: member.partnershipId, title },
    });
    return { id: list.id, title: list.title, items: [] };
  }

  async addItem(userId: string, listId: string, body: string) {
    const list = await this.ownList(userId, listId);
    const item = await this.prisma.sharedListItem.create({ data: { listId: list.id, body } });
    return { id: item.id, body: item.body, done: item.done };
  }

  async setDone(userId: string, listId: string, itemId: string, done: boolean) {
    await this.ownList(userId, listId);
    const item = await this.prisma.sharedListItem.findFirst({ where: { id: itemId, listId } });
    if (!item) throw new ApiException(404, 'ITEM_NOT_FOUND', 'List item not found');
    const updated = await this.prisma.sharedListItem.update({ where: { id: itemId }, data: { done } });
    return { id: updated.id, body: updated.body, done: updated.done };
  }

  async discover(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.city) return [];
    const places = await this.prisma.discoverPlace.findMany({
      where: { city: user.city },
      orderBy: { title: 'asc' },
    });
    return places.map((place) => ({ id: place.id, city: place.city, title: place.title, summary: place.summary }));
  }

  async savePlace(userId: string, placeId: string) {
    const member = await this.requirePair(userId);
    const place = await this.prisma.discoverPlace.findUnique({ where: { id: placeId } });
    if (!place) throw new ApiException(404, 'PLACE_NOT_FOUND', 'Place not found');
    const saved = await this.prisma.savedItem.upsert({
      where: { partnershipId_placeId: { partnershipId: member.partnershipId, placeId } },
      create: { partnershipId: member.partnershipId, placeId },
      update: {},
      include: { place: true },
    });
    return { id: saved.id, placeId: saved.placeId, title: saved.place.title };
  }

  async saved(userId: string) {
    const member = await this.requirePair(userId);
    const items = await this.prisma.savedItem.findMany({
      where: { partnershipId: member.partnershipId },
      include: { place: true },
      orderBy: { createdAt: 'asc' },
    });
    return items.map((item) => ({ id: item.id, placeId: item.placeId, title: item.place.title, city: item.place.city }));
  }

  private async ownList(userId: string, listId: string) {
    const member = await this.requirePair(userId);
    const list = await this.prisma.sharedList.findFirst({
      where: { id: listId, partnershipId: member.partnershipId },
    });
    if (!list) throw new ApiException(404, 'LIST_NOT_FOUND', 'List not found');
    return list;
  }

  private async requirePair(userId: string) {
    const member = await this.membership.findActive(userId);
    if (!member) throw new ApiException(404, 'PARTNERSHIP_NOT_FOUND', 'You are not in a partnership');
    return member;
  }
}
