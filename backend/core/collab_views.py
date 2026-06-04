from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from .models import StudyGroup, GroupMessage, SharedResource, User
from .serializers import StudyGroupSerializer, GroupMessageSerializer, SharedResourceSerializer

class StudyGroupViewSet(viewsets.ModelViewSet):
    serializer_class = StudyGroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StudyGroup.objects.filter(members=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        group = serializer.save(created_by=self.request.user)
        group.members.add(self.request.user)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        group = self.get_object()
        username = request.data.get('username')
        try:
            user_to_add = User.objects.get(username=username)
            group.members.add(user_to_add)
            return Response({'status': 'Miembro agregado', 'username': user_to_add.username})
        except User.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        group = self.get_object()
        group.members.remove(request.user)
        if group.members.count() == 0:
            group.delete()
            return Response({'status': 'Grupo eliminado'})
        return Response({'status': 'Abandonaste el grupo'})

class GroupMessageViewSet(viewsets.ModelViewSet):
    serializer_class = GroupMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        group_id = self.request.query_params.get('group_id')
        if group_id:
            get_object_or_404(StudyGroup, id=group_id, members=self.request.user)
            return GroupMessage.objects.filter(group_id=group_id).order_by('created_at')
        return GroupMessage.objects.filter(group__members=self.request.user).order_by('created_at')

    def perform_create(self, serializer):
        group = serializer.validated_data['group']
        if self.request.user not in group.members.all():
            raise PermissionDenied("No estás en este grupo")
        msg = serializer.save(sender=self.request.user)
        
        resource_type = self.request.data.get('resource_type')
        if resource_type:
            SharedResource.objects.create(
                group=group,
                shared_by=self.request.user,
                resource_type=resource_type,
                message=msg,
                summary_id=self.request.data.get('summary_id'),
                simulation_id=self.request.data.get('simulation_id'),
                document_for_flashcards_id=self.request.data.get('document_for_flashcards_id')
            )

class SharedResourceViewSet(viewsets.ModelViewSet):
    serializer_class = SharedResourceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        group_id = self.request.query_params.get('group_id')
        if group_id:
            return SharedResource.objects.filter(group_id=group_id, group__members=self.request.user).order_by('-created_at')
        return SharedResource.objects.filter(group__members=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['get'])
    def content(self, request, pk=None):
        resource = self.get_object()
        if resource.resource_type == 'summary' and resource.summary:
            return Response({
                'title': resource.summary.title,
                'content': resource.summary.content,
                'type': 'summary'
            })
        elif resource.resource_type == 'simulation' and resource.simulation:
            return Response({
                'title': resource.simulation.title,
                'questions': resource.simulation.questions,
                'type': 'simulation'
            })
        return Response({'error': 'Contenido no disponible'}, status=status.HTTP_404_NOT_FOUND)
