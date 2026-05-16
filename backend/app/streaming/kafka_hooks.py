"""Kafka integration hooks — optional async producer for transaction streaming demos."""

from typing import Any

from app.config import get_settings


async def publish_transaction_event(payload: dict[str, Any]) -> bool:
    """Publish a bronze transaction event to Kafka. Returns False if Kafka unavailable."""

    settings = get_settings()
    try:
        from aiokafka import AIOKafkaProducer
    except ImportError:  # pragma: no cover
        return False

    producer = AIOKafkaProducer(bootstrap_servers=settings.kafka_bootstrap_servers)
    try:
        await producer.start()
        await producer.send_and_wait(
            settings.kafka_topic_transactions,
            value=str(payload).encode("utf-8"),
        )
        return True
    except Exception:
        return False
    finally:
        await producer.stop()
