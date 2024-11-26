from pinecone import Pinecone
from autogpt.api_log import CRITICAL, ERROR, print_log

from autogpt.llm import get_ada_embedding
from autogpt.memory.base import MemoryProvider
from autogpt.config import Config

global_config = Config()

pinecone_api_key = global_config.pinecone_api_key
pinecone_region = global_config.pinecone_region

if pinecone_api_key:
    if pinecone_region:
        pinecone = Pinecone(api_key=pinecone_api_key, region=pinecone_region)
    else:
        pinecone = Pinecone(api_key=pinecone_api_key)
else:
    print("Pinecone API key and region not set. " "Please set them in the config file.")


class PineconeMemory(MemoryProvider):
    cfg: Config

    def __init__(self, cfg):
        self.cfg = cfg
        dimension = 1536
        metric = "cosine"
        pod_type = "p1"
        table_name = global_config.pinecone_table_name or "auto-gpt"
        # this assumes we don't start with memory.
        # for now this works.
        # we'll need a more complicated and robust system if we want to start with
        #  memory.
        self.vec_num = 0

        # if table_name not in pinecone.list_indexes():
        #     pinecone.create_index(
        #         table_name, dimension=dimension, metric=metric, pod_type=pod_type
        #     )
        self.index = pinecone.Index(table_name)

    def add(self, data):
        vector = get_ada_embedding(data, self.cfg)
        # no metadata here. We may wish to change that long term.
        data = [(str(self.vec_num), vector, {"raw_text": data})]
        namespace = self.cfg.agent_id
        try:
            self.index.upsert(
                data,
                namespace=namespace,
            )
        except Exception as e:
            print_log("Pinecone upsert error", severity=CRITICAL, errorMsg=e, pine_data=data, pine_namespace=namespace)
            raise e
        _text = f"Inserting data into memory at index: {self.vec_num}:\n data: {data}"
        self.vec_num += 1
        return _text

    def get(self, data):
        return self.get_relevant(data, 1)

    def clear(self):
        self.index.delete(deleteAll=True, namespace=self.cfg.agent_id)
        return "Obliviated"

    def get_relevant(self, data, num_relevant=5):
        """
        Returns all the data in the memory that is relevant to the given data.
        :param data: The data to compare to.
        :param num_relevant: The number of relevant data to return. Defaults to 5
        """
        query_embedding = get_ada_embedding(data, self.cfg)

        namespace = self.cfg.agent_id
        try:
            results = self.index.query(
                vector=query_embedding,
                top_k=num_relevant,
                include_metadata=True,
                namespace=namespace,
            )
        except Exception as e:
            print_log("Pinecone query error", severity=CRITICAL, errorMsg=e, pine_query=query_embedding, pine_namespace=namespace)
            raise e
        sorted_results = sorted(results.matches, key=lambda x: x.score)
        return [str(item["metadata"]["raw_text"]) for item in sorted_results]

    def get_stats(self):
        return self.index.describe_index_stats()
