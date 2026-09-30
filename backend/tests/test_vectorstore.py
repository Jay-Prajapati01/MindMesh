"""Tests for vectorstore operations."""
import pytest
from unittest.mock import MagicMock, patch
from app.services.vectorstore import delete_by_source_id


def test_delete_by_source_id_no_points():
    """Test delete when no points exist."""
    mock_client = MagicMock()
    mock_client.scroll.return_value = ([], None)
    
    with patch("app.services.vectorstore.get_client", return_value=mock_client):
        with patch("app.services.vectorstore.get_settings") as mock_settings:
            mock_settings.return_value.qdrant_collection = "test_collection"
            result = delete_by_source_id("nonexistent")
            assert result == 0


def test_delete_by_source_id_with_points():
    """Test delete when points exist."""
    mock_point1 = MagicMock()
    mock_point1.id = "id1"
    mock_point2 = MagicMock()
    mock_point2.id = "id2"
    
    mock_client = MagicMock()
    mock_client.scroll.return_value = ([mock_point1, mock_point2], None)
    
    with patch("app.services.vectorstore.get_client", return_value=mock_client):
        with patch("app.services.vectorstore.get_settings") as mock_settings:
            mock_settings.return_value.qdrant_collection = "test_collection"
            result = delete_by_source_id("source123")
            assert result == 2
            mock_client.delete.assert_called_once()
